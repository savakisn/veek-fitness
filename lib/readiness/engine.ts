// The deterministic readiness engine: personal baselines, an uncoupled EWMA load
// ratio and a hard back limit, combined into a verdict and the limits the plan must
// respect. Pure, so the Today screen, the day call and the backtest share it.
import { METRIC } from "../metric-keys";
import type { DaySeries, Readiness, ReadinessInput, Signal, SignalKey, Verdict } from "./types";

// Every threshold in one place so the backtest and the docs can point at them.
export const READINESS = {
  baselineDays: 28, // window ending yesterday
  minBaselinePoints: 7,
  zClamp: 3,
  // Floors on the robust sd, in the metric's unit. Without them a week of near
  // identical nights makes a 0.2 h dip look like a crisis.
  sdFloor: {
    [METRIC.hrvOvernight]: 4, // ms, or 6% of the median when that is larger
    [METRIC.sleepHours]: 0.4,
    [METRIC.sleepScore]: 5,
    [METRIC.restingHr]: 2,
    [METRIC.bodyBattery]: 6,
    [METRIC.bodyBatteryHigh]: 6,
    [METRIC.acuteLoad]: 10,
  } as Record<string, number>,
  hrvSdFloorFraction: 0.06,
  // Weights for the composite; load counts less because it is a guide, not a reading.
  weights: { hrv: 1, sleep: 1, resting_hr: 0.8, body_battery: 0.7, load: 0.6 } as Record<string, number>,
  minScoredSignals: 2, // below this there is no score and the verdict is "steady"
  // Composite z (weighted mean, positive = more ready) to verdict.
  restBelow: -1.5,
  easyBelow: -0.6,
  pushAbove: 0.6,
  // A single strongly bad core reading (HRV or resting HR) caps the day at easy.
  coreAlarmZ: -2,
  // Three or more strongly bad signals make it a rest day whatever the mean says.
  strongBadZ: -1.5,
  restStrongBadCount: 3,
  // Push also needs every signal at or above this and the load ratio under pushMaxRatio.
  pushFloorZ: -1,
  pushMaxRatio: 1.3,
  // Score = 60 + 18 * composite, clamped to 0..100. A normal day sits near 60.
  scoreCenter: 60,
  scorePerZ: 18,
  // Load: EWMA time constants in days, and how the ratio maps to a z.
  acuteTau: 7,
  chronicTau: 28,
  loadDays: 42,
  minLoadHistoryDays: 21, // first logged session must be this old for a ratio
  mentionZ: 0.75, // a signal is named in the headline at or beyond this |z|
  backWindowDays: 2, // back_status counts if logged today or yesterday
};

type Stats = { center: number; sd: number; n: number };

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Median and MAD-scaled sd over the baseline window, or null with too few points.
export function robustBaseline(series: DaySeries | undefined, today: string, metric: string): Stats | null {
  if (!series) return null;
  const from = addDays(today, -READINESS.baselineDays);
  const xs = series.filter((p) => p.date >= from && p.date < today).map((p) => p.value);
  if (xs.length < READINESS.minBaselinePoints) return null;
  const center = median(xs);
  const mad = median(xs.map((x) => Math.abs(x - center))) * 1.4826;
  let floor = READINESS.sdFloor[metric] ?? 1;
  if (metric === METRIC.hrvOvernight) floor = Math.max(floor, Math.abs(center) * READINESS.hrvSdFloorFraction);
  return { center, sd: Math.max(mad, floor), n: xs.length };
}

function valueOn(series: DaySeries | undefined, date: string): number | null {
  const p = series?.find((x) => x.date === date);
  return p ? p.value : null;
}

function countBefore(series: DaySeries | undefined, today: string): number {
  const from = addDays(today, -READINESS.baselineDays);
  return series ? series.filter((p) => p.date >= from && p.date < today).length : 0;
}

export function addDays(iso: string, n: number): string {
  return new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000).toISOString().slice(0, 10);
}

function clampZ(z: number): number {
  return Math.max(-READINESS.zClamp, Math.min(READINESS.zClamp, z));
}

function round(x: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

function effectOf(z: number | null, value: number | null): Signal["effect"] {
  if (value == null) return "missing";
  if (z == null) return "neutral";
  if (z >= 0.5) return "good";
  if (z <= -0.5) return "bad";
  return "neutral";
}

function fmt(x: number, dp = 1): string {
  return String(round(x, dp));
}

// A reading against its baseline. higherIsBetter flips the sign for resting HR.
function scoredSignal(
  key: SignalKey,
  label: string,
  unit: string,
  series: DaySeries | undefined,
  metric: string,
  today: string,
  higherIsBetter: boolean,
  describe: (value: number, diff: number) => string,
): Signal {
  const value = valueOn(series, today);
  const base = robustBaseline(series, today, metric);
  if (value == null) {
    return { key, label, value: null, unit, baseline: base ? round(base.center) : null, z: null, effect: "missing", note: "No reading today." };
  }
  if (!base) {
    const have = countBefore(series, today);
    return {
      key,
      label,
      value,
      unit,
      baseline: null,
      z: null,
      effect: "neutral",
      note: `Building a baseline (${have} of ${READINESS.minBaselinePoints} days).`,
    };
  }
  const raw = (value - base.center) / base.sd;
  const z = round(clampZ(higherIsBetter ? raw : -raw), 2);
  return { key, label, value, unit, baseline: round(base.center), z, effect: effectOf(z, value), note: describe(value, value - base.center) };
}

function sleepSignal(input: ReadinessInput): Signal {
  const { today, series } = input;
  const hours = scoredSignal("sleep", "Sleep", "h", series[METRIC.sleepHours], METRIC.sleepHours, today, true, (v, d) =>
    Math.abs(d) < 0.15 ? `${fmt(v)} h, right on your norm.` : `${fmt(v)} h, ${fmt(Math.abs(d))} h ${d < 0 ? "under" : "over"} your norm.`,
  );
  const score = scoredSignal("sleep", "Sleep", "", series[METRIC.sleepScore], METRIC.sleepScore, today, true, (v, d) =>
    `Sleep score ${fmt(v, 0)}, ${fmt(Math.abs(d), 0)} ${d < 0 ? "under" : "over"} your norm.`,
  );
  if (hours.value == null && score.value != null) return score;
  if (hours.z != null && score.z != null) {
    // Both readings describe one night; average them so sleep is not counted twice.
    const z = round((hours.z + score.z) / 2, 2);
    return { ...hours, z, effect: effectOf(z, hours.value) };
  }
  return hours;
}

function bodyBatterySignal(input: ReadinessInput): Signal {
  const { today, series } = input;
  const high = series[METRIC.bodyBatteryHigh];
  const useHigh = valueOn(high, today) != null || countBefore(high, today) >= READINESS.minBaselinePoints;
  const metric = useHigh ? METRIC.bodyBatteryHigh : METRIC.bodyBattery;
  return scoredSignal("body_battery", "Body battery", "", series[metric], metric, today, true, (v, d) =>
    Math.abs(d) < 3 ? `Peaked at ${fmt(v, 0)}, near your norm.` : `Peaked at ${fmt(v, 0)}, ${fmt(Math.abs(d), 0)} ${d < 0 ? "under" : "over"} your norm.`,
  );
}

// TRIMP-style session load: minutes times an intensity from heart rate, else
// effort 1-5, else a moderate guess.
export function sessionLoad(w: ReadinessInput["workouts"][number]): number {
  const dur = w.durationMinutes ?? 30;
  let intensity = 0.8;
  if (w.avgHr) intensity = Math.min(1.6, Math.max(0.4, (w.avgHr - 80) / 80));
  else if (w.perceivedEffort) intensity = w.perceivedEffort / 3;
  return dur * intensity;
}

export type LoadState = { acute: number; chronic: number; ratio: number; source: "garmin" | "sessions" };

// Bias-corrected EWMA with time constant tau, over daily values oldest first.
function ewma(daily: number[], tau: number): number {
  const a = 1 / tau;
  let v = 0;
  for (const x of daily) v += a * (x - v);
  const corr = 1 - (1 - a) ** daily.length;
  return corr > 0 ? v / corr : 0;
}

// Acute vs chronic, uncoupled: the chronic EWMA stops where the acute week starts,
// so a hard week is compared against what came before it, not against itself.
export function loadState(input: ReadinessInput): LoadState | null {
  const { today } = input;
  const garmin = input.series[METRIC.acuteLoad];
  const latest = garmin?.filter((p) => p.date <= today && p.date >= addDays(today, -1)).at(-1);
  if (latest) {
    // Garmin's acute load is already a 7-day weighted sum, so its chronic is just
    // its own 28-day history before this week.
    const from = addDays(today, -35);
    const to = addDays(today, -7);
    const prior = garmin!.filter((p) => p.date >= from && p.date < to).map((p) => p.value);
    if (prior.length >= 14) {
      const chronic = prior.reduce((s, x) => s + x, 0) / prior.length;
      if (chronic > 0) return { acute: latest.value, chronic, ratio: Math.min(3, latest.value / chronic), source: "garmin" };
    }
  }

  const start = addDays(today, -(READINESS.loadDays - 1));
  const sessions = input.workouts.filter((w) => w.date >= start && w.date <= today);
  if (sessions.length === 0) return null;
  const first = sessions.reduce((m, w) => (w.date < m ? w.date : m), today);
  if (first > addDays(today, -READINESS.minLoadHistoryDays)) return null;

  const byDay = new Map<string, number>();
  for (const w of sessions) byDay.set(w.date, (byDay.get(w.date) ?? 0) + sessionLoad(w));
  const daily: number[] = [];
  for (let i = READINESS.loadDays - 1; i >= 0; i--) daily.push(byDay.get(addDays(today, -i)) ?? 0);

  const acute = ewma(daily, READINESS.acuteTau);
  const chronic = ewma(daily.slice(0, daily.length - 7), READINESS.chronicTau);
  if (chronic <= 0) return null;
  return { acute, chronic, ratio: Math.min(3, acute / chronic), source: "sessions" };
}

// Ratio to a readiness z. Above 1 counts against readiness (0.25 of ratio per z);
// below 1 helps only a little, since a quiet week is freshness, not fitness.
export function loadZ(ratio: number): number {
  const z = ratio > 1 ? -(ratio - 1) / 0.25 : (1 - ratio) / 0.5;
  return round(Math.max(-READINESS.zClamp, Math.min(0.5, z)), 2);
}

function loadSignal(input: ReadinessInput): { signal: Signal; state: LoadState | null } {
  const state = loadState(input);
  if (!state) {
    return {
      signal: { key: "load", label: "Load", value: null, unit: "x", baseline: null, z: null, effect: "missing", note: "Not enough logged sessions for a load ratio." },
      state,
    };
  }
  const ratio = round(state.ratio, 2);
  const z = loadZ(state.ratio);
  let note = `This week is ${fmt(ratio, 2)}x your usual load.`;
  if (ratio > 1.5) note = `This week is ${fmt(ratio, 2)}x your usual load, a sharp jump.`;
  else if (ratio < 0.8) note = `This week is ${fmt(ratio, 2)}x your usual load, a lighter stretch.`;
  return { signal: { key: "load", label: "Load", value: ratio, unit: "x", baseline: 1, z, effect: effectOf(z, ratio), note }, state };
}

function backSignal(input: ReadinessInput): Signal {
  const s = input.series[METRIC.backStatus];
  const from = addDays(input.today, -(READINESS.backWindowDays - 1));
  const latest = s?.filter((p) => p.date >= from && p.date <= input.today).at(-1);
  if (!latest) return { key: "back", label: "Back", value: null, unit: "", baseline: null, z: null, effect: "missing", note: "No back check-in today." };
  const v = Math.round(latest.value);
  const note = v >= 2 ? "Back is sore, so back-safe moves only and no strength work." : v === 1 ? "Back is tight, so back-safe moves at moderate effort." : "Back feels fine.";
  return { key: "back", label: "Back", value: v, unit: "", baseline: null, z: null, effect: v >= 1 ? "bad" : "good", note };
}

const INTENSITY: Record<Verdict, Readiness["limits"]["maxIntensity"]> = { rest: "none", easy: "low", steady: "moderate", push: "high" };
const ORDER: Verdict[] = ["rest", "easy", "steady", "push"];
const INT_ORDER: Readiness["limits"]["maxIntensity"][] = ["none", "low", "moderate", "high"];

function minVerdict(a: Verdict, b: Verdict): Verdict {
  return ORDER[Math.min(ORDER.indexOf(a), ORDER.indexOf(b))];
}

// Encoded 0..3 for storage in numeric jsonb.
export function verdictCode(v: Verdict): number {
  return ORDER.indexOf(v);
}

// Short clause for the headline, or null if the signal is not worth naming.
function phrase(s: Signal): string | null {
  if (s.z == null || s.value == null) return null;
  const d = s.baseline != null ? s.value - s.baseline : 0;
  switch (s.key) {
    case "sleep":
      if (s.unit === "h") return `sleep ran ${fmt(Math.abs(d))} h ${d < 0 ? "short" : "long"}`;
      return `sleep score is ${d < 0 ? "down" : "up"} ${fmt(Math.abs(d), 0)}`;
    case "resting_hr":
      return `resting HR is ${d > 0 ? "up" : "down"} ${fmt(Math.abs(d), 0)}`;
    case "hrv":
      return `HRV is ${d < 0 ? "down" : "up"} ${fmt(Math.abs(d), 0)} ms`;
    case "body_battery":
      return `body battery is ${d < 0 ? "down" : "up"} ${fmt(Math.abs(d), 0)}`;
    case "load":
      return s.value > 1 ? `load is ${fmt(s.value, 1)}x your usual` : "load has been light";
    default:
      return null;
  }
}

function sentence(parts: string[]): string {
  const s = parts.join(" and ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

export function computeReadiness(input: ReadinessInput): Readiness {
  const { today, series } = input;
  const hrv = scoredSignal("hrv", "HRV", "ms", series[METRIC.hrvOvernight], METRIC.hrvOvernight, today, true, (v, d) =>
    Math.abs(d) < 1 ? `${fmt(v, 0)} ms, right on your norm.` : `${fmt(v, 0)} ms, ${fmt(Math.abs(d), 0)} ms ${d < 0 ? "under" : "over"} your norm.`,
  );
  const sleep = sleepSignal(input);
  const rhr = scoredSignal("resting_hr", "Resting HR", "bpm", series[METRIC.restingHr], METRIC.restingHr, today, false, (v, d) =>
    Math.abs(d) < 1 ? `${fmt(v, 0)} bpm, right on your norm.` : `${fmt(v, 0)} bpm, ${fmt(Math.abs(d), 0)} ${d > 0 ? "above" : "below"} your norm.`,
  );
  const bb = bodyBatterySignal(input);
  const { signal: load, state } = loadSignal(input);
  const back = backSignal(input);
  const signals = [hrv, sleep, rhr, bb, load, back];

  const scored = signals.filter((s) => s.z != null && s.key !== "back");
  const confidence: Readiness["confidence"] = scored.length >= 4 ? "high" : scored.length >= 2 ? "medium" : "low";

  let verdict: Verdict = "steady";
  let score: number | null = null;
  if (scored.length >= READINESS.minScoredSignals) {
    let wsum = 0;
    let zsum = 0;
    for (const s of scored) {
      const w = READINESS.weights[s.key] ?? 1;
      wsum += w;
      zsum += w * (s.z as number);
    }
    const composite = zsum / wsum;
    score = Math.max(0, Math.min(100, Math.round(READINESS.scoreCenter + READINESS.scorePerZ * composite)));
    const strongBad = scored.filter((s) => (s.z as number) <= READINESS.strongBadZ).length;
    const coreAlarm = scored.some((s) => (s.key === "hrv" || s.key === "resting_hr") && (s.z as number) <= READINESS.coreAlarmZ);

    if (composite <= READINESS.restBelow || strongBad >= READINESS.restStrongBadCount) verdict = "rest";
    else if (composite <= READINESS.easyBelow || coreAlarm) verdict = "easy";
    else if (
      composite >= READINESS.pushAbove &&
      scored.every((s) => (s.z as number) >= READINESS.pushFloorZ) &&
      (state == null || state.ratio <= READINESS.pushMaxRatio)
    )
      verdict = "push";
  }

  // Back is a hard limit applied after scoring, never averaged in.
  const backLevel = back.value ?? 0;
  const otherBad = scored.some((s) => (s.z as number) <= READINESS.strongBadZ) || verdict === "rest" || verdict === "easy";
  if (backLevel >= 2) verdict = otherBad ? "rest" : minVerdict(verdict, "easy");
  else if (backLevel === 1) verdict = minVerdict(verdict, "steady");

  let maxIntensity = INTENSITY[verdict];
  if (backLevel >= 2) maxIntensity = INT_ORDER[Math.min(INT_ORDER.indexOf(maxIntensity), INT_ORDER.indexOf("low"))];
  else if (backLevel === 1) maxIntensity = INT_ORDER[Math.min(INT_ORDER.indexOf(maxIntensity), INT_ORDER.indexOf("moderate"))];

  const limits: Readiness["limits"] = {
    maxIntensity,
    backSafeOnly: backLevel >= 1,
    avoidCategories: backLevel >= 2 ? ["strength"] : [],
  };

  return { date: today, verdict, score, confidence, headline: headline(verdict, score, scored, backLevel), signals, limits };
}

const LEAD: Record<Verdict, string> = { push: "Push day.", steady: "Steady day.", easy: "Easy day.", rest: "Rest day." };

function headline(verdict: Verdict, score: number | null, scored: Signal[], backLevel: number): string {
  const backPart = backLevel >= 2 ? "your back is sore" : backLevel === 1 ? "your back is tight" : null;
  if (score == null) {
    const base = "Not enough history yet; going by feel.";
    return backPart ? `${LEAD[verdict]} ${sentence([backPart])} ${base}` : base;
  }
  const good = verdict === "push";
  const ranked = [...scored]
    .filter((s) => (good ? (s.z as number) >= READINESS.mentionZ : (s.z as number) <= -READINESS.mentionZ))
    .sort((a, b) => (good ? (b.z as number) - (a.z as number) : (a.z as number) - (b.z as number)));
  const parts = [backPart, ...ranked.map(phrase)].filter((p): p is string => !!p).slice(0, 2);
  if (parts.length === 0) {
    if (verdict === "steady") return "Steady day. Everything is near your norm.";
    return `${LEAD[verdict]} Readings are a little off across the board.`;
  }
  return `${LEAD[verdict]} ${sentence(parts)}`;
}
