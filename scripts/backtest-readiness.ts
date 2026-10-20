// Replays the readiness engine over past days using only what was known each
// morning, then checks it against what happened: sessions that day, their effort,
// and the next day's resting HR. Read-only.
//
//   npm run backtest                 local PGlite (./.pglite) or DATABASE_URL from .env
//   npm run backtest -- --synthetic  90 generated days with a planted signal
import { existsSync } from "node:fs";
import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { computeReadiness, addDays } from "../lib/readiness/engine";
import { buildReadinessInput, type MetricRow, type WorkoutRow } from "../lib/readiness/input";
import { METRIC } from "../lib/metric-keys";
import type { Readiness, Verdict } from "../lib/readiness/types";
import * as schema from "../lib/db/schema";
import { todayISO } from "../lib/format";

type Dataset = { name: string; metrics: MetricRow[]; workouts: (WorkoutRow & { perceivedEffort: number | null })[] };

type Day = {
  date: string;
  r: Readiness;
  sessions: number;
  effort: number | null; // mean perceived effort that day
  rhrNext: number | null; // tomorrow's resting HR minus today's
};

// Each day's call sees that morning's readings but not that day's sessions,
// since those are the outcome being predicted.
function replay(ds: Dataset): Day[] {
  const dates = new Set<string>([...ds.metrics.map((m) => m.date), ...ds.workouts.map((w) => w.date)]);
  const sorted = [...dates].sort();
  if (sorted.length === 0) return [];
  const rhr = new Map(ds.metrics.filter((m) => m.metricType === METRIC.restingHr).map((m) => [m.date, m.value]));
  const out: Day[] = [];
  for (const date of sorted) {
    const before = ds.workouts.filter((w) => w.date < date);
    const r = computeReadiness(buildReadinessInput(date, ds.metrics, before));
    const that = ds.workouts.filter((w) => w.date === date);
    const efforts = that.map((w) => w.perceivedEffort).filter((x): x is number => x != null);
    const a = rhr.get(date);
    const b = rhr.get(addDays(date, 1));
    out.push({
      date,
      r,
      sessions: that.length,
      effort: efforts.length ? efforts.reduce((s, x) => s + x, 0) / efforts.length : null,
      rhrNext: a != null && b != null ? b - a : null,
    });
  }
  return out;
}

function ranks(xs: number[]): number[] {
  const idx = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

const spearman = (a: number[], b: number[]) => pearson(ranks(a), ranks(b));

// Share of shuffles at least as strong as the real rho (one sided, expecting negative).
function permutationP(a: number[], b: number[], rho: number, n = 2000): number {
  const rnd = rng(7);
  const ra = ranks(a);
  const rb = ranks(b);
  let hits = 0;
  for (let k = 0; k < n; k++) {
    const s = [...rb];
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
    if (pearson(ra, s) <= rho) hits++;
  }
  return (hits + 1) / (n + 1);
}

const VERDICTS: Verdict[] = ["rest", "easy", "steady", "push"];
const f = (x: number | null, dp = 2) => (x == null || Number.isNaN(x) ? "-" : x.toFixed(dp));
const pad = (s: string, n: number) => s.padEnd(n);
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

function report(name: string, days: Day[]) {
  console.log(`\n== ${name}: ${days.length} days ==`);
  if (days.length === 0) {
    console.log("No data.");
    return;
  }
  const scored = days.filter((d) => d.r.score != null);
  const conf = { low: 0, medium: 0, high: 0 };
  for (const d of days) conf[d.r.confidence]++;
  console.log(`scored ${scored.length}/${days.length}   confidence low ${conf.low} / medium ${conf.medium} / high ${conf.high}`);
  console.log(`${pad("verdict", 8)} ${pad("days", 5)} ${pad("w/ session", 11)} ${pad("mean effort", 12)} ${pad("effort>=4", 10)} next-day RHR`);
  for (const v of VERDICTS) {
    const ds = days.filter((d) => d.r.verdict === v);
    const withS = ds.filter((d) => d.sessions > 0);
    const eff = ds.map((d) => d.effort).filter((x): x is number => x != null);
    const hard = eff.filter((x) => x >= 4).length;
    const rhr = ds.map((d) => d.rhrNext).filter((x): x is number => x != null);
    console.log(
      `${pad(v, 8)} ${pad(String(ds.length), 5)} ${pad(String(withS.length), 11)} ${pad(f(mean(eff)), 12)} ${pad(eff.length ? `${Math.round((100 * hard) / eff.length)}%` : "-", 10)} ${rhr.length ? (mean(rhr)! >= 0 ? "+" : "") + f(mean(rhr)) : "-"}`,
    );
  }

  // Agreement: a lower score should go with sessions that felt harder.
  const pairs = scored.filter((d) => d.effort != null);
  if (pairs.length >= 8) {
    const s = pairs.map((d) => d.r.score as number);
    const e = pairs.map((d) => d.effort as number);
    const rho = spearman(s, e);
    console.log(`score vs effort: Spearman rho ${f(rho)} over ${pairs.length} session days, permutation p ${f(permutationP(s, e, rho), 3)} (negative rho = engine agrees)`);
    const low = pairs.filter((d) => d.r.verdict === "rest" || d.r.verdict === "easy");
    const high = pairs.filter((d) => d.r.verdict === "steady" || d.r.verdict === "push");
    const hardRate = (xs: Day[]) => (xs.length ? xs.filter((d) => (d.effort as number) >= 4).length / xs.length : null);
    console.log(`hard sessions (effort>=4): ${f(hardRate(low) != null ? hardRate(low)! * 100 : null, 0)}% on easy/rest calls vs ${f(hardRate(high) != null ? hardRate(high)! * 100 : null, 0)}% on steady/push calls`);
  } else {
    console.log(`score vs effort: only ${pairs.length} scored session days with effort, too few to judge`);
  }
  const rp = scored.filter((d) => d.rhrNext != null);
  if (rp.length >= 8) {
    // Expect a positive rho from regression to the mean alone, so this is context, not proof.
    console.log(`score vs next-day RHR change: Spearman rho ${f(spearman(rp.map((d) => d.r.score as number), rp.map((d) => d.rhrNext as number)))} over ${rp.length} days (partly regression to the mean)`);
  }
}

// Small seeded PRNG so --synthetic prints the same table every run.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

// 90 days for one person. Planted: a short night (by wake date) makes that day's
// session feel about 1.3 points harder and nudges HRV down and resting HR up.
// A hidden fatigue state, fed by recent sessions, adds a slower version of the same.
function synthetic(days = 90, seed = 42): Dataset {
  const r = rng(seed);
  const start = addDays("2026-10-20", -days);
  const metrics: MetricRow[] = [];
  const workouts: Dataset["workouts"] = [];
  let fatigue = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const short = r() < 0.2;
    const sleep = short ? 5.6 + r() * 0.8 : 7.2 + gauss(r) * 0.4;
    const hrv = 58 - 5 * fatigue - (short ? 5 : 0) + gauss(r) * 3;
    const rhr = 52 + 1.8 * fatigue + (short ? 2.5 : 0) + gauss(r) * 1.2;
    const bb = 78 - 8 * fatigue - (short ? 10 : 0) + gauss(r) * 5;
    const push = (metricType: string, value: number) => metrics.push({ date, metricType, value: Math.round(value * 10) / 10, source: "garmin" });
    push(METRIC.sleepHours, sleep);
    push(METRIC.hrvOvernight, hrv);
    push(METRIC.restingHr, rhr);
    push(METRIC.bodyBatteryHigh, Math.min(100, bb));
    if (i > 40 && i < 45) metrics.push({ date, metricType: METRIC.backStatus, value: 2, source: "manual" });

    let load = 0;
    if (r() < 0.6) {
      const dur = 30 + Math.round(r() * 30);
      const effort = Math.max(1, Math.min(5, Math.round(2.6 + 1.3 * (short ? 1 : 0) + 0.8 * fatigue + gauss(r) * 0.6)));
      workouts.push({ date, durationMinutes: dur, perceivedEffort: effort, goalTag: "full_body" });
      load = (dur * effort) / 3;
    }
    fatigue = 0.75 * fatigue + load / 120;
  }
  return { name: "synthetic (planted: short sleep -> harder session that day)", metrics, workouts };
}

// Control: the same days with efforts shuffled, so any agreement must be the plant.
function shuffled(ds: Dataset, seed = 9): Dataset {
  const r = rng(seed);
  const efforts = ds.workouts.map((w) => w.perceivedEffort);
  for (let i = efforts.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [efforts[i], efforts[j]] = [efforts[j], efforts[i]];
  }
  return { name: "control (same data, efforts shuffled)", metrics: ds.metrics, workouts: ds.workouts.map((w, i) => ({ ...w, perceivedEffort: efforts[i] })) };
}

async function fromDb(): Promise<Dataset[]> {
  // Both backends share the Drizzle query API, as in lib/db/index.ts.
  let d: PostgresJsDatabase<typeof schema>;
  let close: () => Promise<void>;
  const url = process.env.DATABASE_URL;
  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    // A read-only session, so a bug here cannot write to the real database.
    const client = postgres(url, { max: 1, prepare: false, connection: { default_transaction_read_only: true } });
    d = drizzle(client, { schema });
    close = () => client.end();
    console.log("Source: DATABASE_URL (read-only session)");
  } else {
    if (!existsSync("./.pglite")) {
      console.log("No DATABASE_URL and no ./.pglite yet. Run the app once (npm run dev) or use --synthetic.");
      return [];
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite("./.pglite");
    d = drizzle(client, { schema }) as unknown as PostgresJsDatabase<typeof schema>;
    close = () => client.close();
    console.log("Source: local PGlite ./.pglite");
  }
  try {
    const users = await d.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).orderBy(asc(schema.users.id));
    const out: Dataset[] = [];
    for (const u of users) {
      const metrics = await d
        .select({ date: schema.metrics.date, metricType: schema.metrics.metricType, value: schema.metrics.value, source: schema.metrics.source })
        .from(schema.metrics)
        .where(eq(schema.metrics.userId, u.id));
      const ws = await d
        .select({
          date: schema.workouts.date,
          durationMinutes: schema.workouts.durationMinutes,
          perceivedEffort: schema.workouts.perceivedEffort,
          detail: schema.workouts.detail,
          type: schema.workouts.type,
          goalTag: schema.routines.goalTag,
        })
        .from(schema.workouts)
        .leftJoin(schema.routines, eq(schema.workouts.routineId, schema.routines.id))
        .where(eq(schema.workouts.userId, u.id));
      out.push({ name: u.name, metrics, workouts: ws.map((w) => ({ ...w, avgHr: w.detail?.avgHr ?? null })) });
    }
    return out;
  } finally {
    await close();
  }
}

async function main() {
  if (process.argv.includes("--synthetic")) {
    const ds = synthetic();
    report(ds.name, replay(ds));
    const ctl = shuffled(ds);
    report(ctl.name, replay(ctl));
    return;
  }
  const today = todayISO();
  for (const ds of await fromDb()) {
    // Today is not over, so it has no outcome yet.
    report(ds.name, replay(ds).filter((d) => d.date < today));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
