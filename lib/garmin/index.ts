import "server-only";
import { GarminConnect } from "garmin-connect";
import { asc, eq, and } from "drizzle-orm";
import { getDb } from "../db";
import type { DB } from "../db";
import { users, workouts, metrics, garminAuth } from "../db/schema";
import { upsertFitnessAge } from "../fitness-age";

// Pulls Garmin data into one user's record (Garmin belongs to Nick). Unofficial
// library, so everything is best-effort and deduped by (user, source, external_id).
export type GarminSyncResult = { activities: number; metrics: number };

type GarminActivity = {
  activityId: number;
  activityName?: string;
  activityType?: { typeKey?: string };
  startTimeLocal?: string;
  duration?: number;
  averageHR?: number;
  maxHR?: number;
  calories?: number;
  distance?: number;
  elevationGain?: number;
};

type Detail = {
  avgHr?: number;
  maxHr?: number;
  calories?: number;
  distanceKm?: number;
  elevationM?: number;
  hrSamples?: { t: number; hr: number }[];
  speedSamples?: { t: number; v: number }[];
  distSamples?: { t: number; d: number }[];
  trim?: { startSec: number; endSec: number };
};

function activityDetail(a: GarminActivity): Detail {
  const round = (n: number, p = 0) => Math.round(n * 10 ** p) / 10 ** p;
  return {
    avgHr: a.averageHR ? Math.round(a.averageHR) : undefined,
    maxHr: a.maxHR ? Math.round(a.maxHR) : undefined,
    calories: a.calories ? Math.round(a.calories) : undefined,
    distanceKm: a.distance ? round(a.distance / 1000, 2) : undefined,
    elevationM: a.elevationGain ? Math.round(a.elevationGain) : undefined,
  };
}

function nearestDist(samples: { t: number; d: number }[], sec: number): number | null {
  if (!samples.length) return null;
  let best = samples[0];
  for (const s of samples) if (Math.abs(s.t - sec) < Math.abs(best.t - sec)) best = s;
  return best.d;
}

// HR, speed, and cumulative distance samples for one activity, via the details
// endpoint. Best-effort; powers the HR chart and session trimming.
async function fetchActivitySamples(
  client: GarminConnect,
  activityId: number,
): Promise<Pick<Detail, "hrSamples" | "speedSamples" | "distSamples">> {
  const url = `https://connectapi.garmin.com/activity-service/activity/${activityId}/details?maxChartSize=200`;
  const data = await client.get<{
    metricDescriptors?: { metricsIndex: number; key: string }[];
    activityDetailMetrics?: { metrics: (number | null)[] }[];
  }>(url);
  const descs = data?.metricDescriptors ?? [];
  const rows = data?.activityDetailMetrics ?? [];
  const idx = (k: string) => descs.find((d) => d.key === k)?.metricsIndex;
  const tIdx = idx("sumElapsedDuration");
  const hrIdx = idx("directHeartRate");
  const spIdx = idx("directSpeed");
  const dIdx = idx("sumDistance");

  const hrSamples: { t: number; hr: number }[] = [];
  const speedSamples: { t: number; v: number }[] = [];
  const distSamples: { t: number; d: number }[] = [];
  rows.forEach((row, i) => {
    const t = tIdx != null && typeof row.metrics?.[tIdx] === "number" ? Math.round(row.metrics[tIdx] as number) : i;
    const hr = hrIdx != null ? row.metrics?.[hrIdx] : null;
    if (typeof hr === "number" && hr > 0) hrSamples.push({ t, hr: Math.round(hr) });
    const sp = spIdx != null ? row.metrics?.[spIdx] : null;
    if (typeof sp === "number") speedSamples.push({ t, v: Math.round(sp * 100) / 100 });
    const d = dIdx != null ? row.metrics?.[dIdx] : null;
    if (typeof d === "number") distSamples.push({ t, d: Math.round(d) });
  });
  return {
    hrSamples: hrSamples.length ? hrSamples : undefined,
    speedSamples: speedSamples.length ? speedSamples : undefined,
    distSamples: distSamples.length ? distSamples : undefined,
  };
}

async function targetUserId(db: DB): Promise<number> {
  const envId = process.env.GARMIN_USER_ID;
  if (envId && /^\d+$/.test(envId)) return Number.parseInt(envId, 10);
  const [first] = await db.select({ id: users.id }).from(users).orderBy(asc(users.id)).limit(1);
  return first.id;
}

// Garmin's own VO2max for a date (the basis of its fitness age). Best-effort.
async function pullVo2Max(db: DB, client: GarminConnect, userId: number, dateStr: string): Promise<void> {
  try {
    const mm = await client.get<{ generic?: { vo2MaxPreciseValue?: number; vo2MaxValue?: number } }>(
      `https://connectapi.garmin.com/metrics-service/metrics/maxmet/latest/${dateStr}`,
    );
    const vo2 = mm?.generic?.vo2MaxPreciseValue ?? mm?.generic?.vo2MaxValue;
    if (typeof vo2 === "number" && vo2 > 0) await upsertMetric(db, userId, dateStr, "vo2max", Math.round(vo2 * 10) / 10);
  } catch {
    /* vo2max unavailable */
  }
}

async function upsertMetric(db: DB, userId: number, date: string, metricType: string, value: number) {
  await db
    .insert(metrics)
    .values({ userId, date, metricType, value, source: "garmin" })
    .onConflictDoUpdate({
      target: [metrics.userId, metrics.date, metrics.metricType, metrics.source],
      set: { value },
    });
}

// A logged-in client, reusing a cached OAuth token so live fetches are fast.
async function loginClient(db: DB): Promise<GarminConnect> {
  const username = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!username || !password) throw new Error("GARMIN_EMAIL / GARMIN_PASSWORD not set.");
  const client = new GarminConnect({ username, password });

  try {
    const [row] = await db.select().from(garminAuth).where(eq(garminAuth.id, 1));
    if (row?.oauth1 && row?.oauth2) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.loadToken(row.oauth1 as any, row.oauth2 as any);
      await client.getUserProfile(); // throws if the token is stale
      return client;
    }
  } catch {
    /* no/stale token, fall through to a full login */
  }

  await client.login();
  try {
    const tokens = client.exportToken() as unknown as { oauth1: unknown; oauth2: unknown };
    await db
      .insert(garminAuth)
      .values({ id: 1, oauth1: tokens.oauth1, oauth2: tokens.oauth2, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: garminAuth.id,
        set: { oauth1: tokens.oauth1, oauth2: tokens.oauth2, updatedAt: new Date() },
      });
  } catch {
    /* token export failed; we just re-login next time */
  }
  return client;
}

// Today's "right now" numbers — body battery (with recharge/drain), steps, resting
// HR. Called on app open so the card stays current, like the Garmin app.
export async function fetchLiveMetrics(): Promise<{ updated: number }> {
  const db = await getDb();
  const userId = await targetUserId(db);
  const client = await loginClient(db);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  let updated = 0;

  try {
    const steps = (await client.getSteps(today)) as unknown;
    if (typeof steps === "number" && steps > 0) {
      await upsertMetric(db, userId, todayStr, "steps", steps);
      updated++;
    }
  } catch {
    /* steps unavailable */
  }
  try {
    const hr = (await client.getHeartRate(today)) as unknown as { restingHeartRate?: number };
    if (typeof hr?.restingHeartRate === "number" && hr.restingHeartRate > 0) {
      await upsertMetric(db, userId, todayStr, "resting_hr", hr.restingHeartRate);
      updated++;
    }
  } catch {
    /* resting hr unavailable */
  }
  try {
    const profile = (await client.getUserProfile()) as unknown as { displayName?: string };
    if (profile?.displayName) {
      const s = await client.get<{
        bodyBatteryMostRecentValue?: number;
        bodyBatteryHighestValue?: number;
        bodyBatteryChargedValue?: number;
        bodyBatteryDrainedValue?: number;
      }>(`https://connectapi.garmin.com/usersummary-service/usersummary/daily/${profile.displayName}?calendarDate=${todayStr}`);
      const bb = s?.bodyBatteryMostRecentValue ?? s?.bodyBatteryHighestValue;
      if (typeof bb === "number" && bb > 0) {
        await upsertMetric(db, userId, todayStr, "body_battery", bb);
        updated++;
      }
      if (typeof s?.bodyBatteryChargedValue === "number")
        await upsertMetric(db, userId, todayStr, "body_battery_charged", s.bodyBatteryChargedValue);
      if (typeof s?.bodyBatteryDrainedValue === "number")
        await upsertMetric(db, userId, todayStr, "body_battery_drained", s.bodyBatteryDrainedValue);
    }
  } catch {
    /* body battery unavailable */
  }
  // Recompute fitness age each open. Pull Garmin's VO2max first so it's the input.
  await pullVo2Max(db, client, userId, todayStr);
  try {
    if (await upsertFitnessAge(db, userId)) updated++;
  } catch {
    /* fitness age unavailable */
  }
  // Record when we last pulled, so the UI can show data freshness.
  await upsertMetric(db, userId, todayStr, "synced_at", Math.floor(Date.now() / 1000));
  return { updated };
}

// Today's intraday Body Battery curve (the rise-overnight, fall-through-day
// shape Garmin shows). Pulled live for the deep-dive page; not persisted.
export async function fetchBodyBatteryToday(): Promise<{ ts: number; level: number }[]> {
  const db = await getDb();
  const client = await loginClient(db);
  const date = new Date().toISOString().slice(0, 10);
  try {
    const r = await client.get<{ bodyBatteryValuesArray?: (number | string)[][] }>(
      `https://connectapi.garmin.com/wellness-service/wellness/dailyStress/${date}`,
    );
    const out: { ts: number; level: number }[] = [];
    for (const e of r?.bodyBatteryValuesArray ?? []) {
      const ts = Number(e[0]);
      const level = Number(e[e.length - 1]);
      // Raw GMT ms; the client converts to local hours so the curve lines up.
      if (Number.isFinite(ts) && Number.isFinite(level) && level >= 0 && level <= 100) {
        out.push({ ts, level });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function syncGarmin(): Promise<GarminSyncResult> {
  const db = await getDb();
  const userId = await targetUserId(db);
  const client = await loginClient(db);

  const acts = (await client.getActivities(0, 30)) as unknown as GarminActivity[];
  // A previously saved trim must survive re-sync, so carry it onto the fresh detail.
  const existing = await db
    .select({ externalId: workouts.externalId, detail: workouts.detail })
    .from(workouts)
    .where(eq(workouts.userId, userId));
  const savedTrim = new Map(
    existing
      .filter((e) => e.externalId && e.detail?.trim)
      .map((e) => [e.externalId as string, e.detail!.trim!]),
  );
  let activities = 0;
  let sampled = 0;
  for (const a of acts) {
    const date = (a.startTimeLocal ?? "").slice(0, 10);
    if (!date) continue;
    const type = a.activityName || a.activityType?.typeKey || "Activity";
    let durationMinutes = a.duration ? Math.round(a.duration / 60) : null;
    const detail = activityDetail(a);
    if (sampled < 6) {
      try {
        Object.assign(detail, await fetchActivitySamples(client, a.activityId));
      } catch {
        /* detail samples unavailable */
      }
      sampled++;
    }
    const trim = savedTrim.get(String(a.activityId));
    if (trim) {
      detail.trim = trim;
      durationMinutes = Math.max(1, Math.round((trim.endSec - trim.startSec) / 60));
      if (detail.distSamples?.length) {
        const dStart = nearestDist(detail.distSamples, trim.startSec);
        const dEnd = nearestDist(detail.distSamples, trim.endSec);
        if (dStart != null && dEnd != null) detail.distanceKm = Math.round(((dEnd - dStart) / 1000) * 100) / 100;
      }
    }
    await db
      .insert(workouts)
      .values({ userId, date, source: "garmin", externalId: String(a.activityId), type, durationMinutes, location: "outdoor", detail })
      // Refresh stats on re-sync, but don't clobber a relabelled type or a trim.
      .onConflictDoUpdate({
        target: [workouts.userId, workouts.source, workouts.externalId],
        set: { durationMinutes, detail },
      });
    activities++;
  }

  // Daily numbers, best-effort and independent — never break the activity sync.
  let metricCount = 0;
  const day = new Date(Date.now() - 86400000);
  const dayStr = day.toISOString().slice(0, 10);
  for (let i = 1; i <= 14; i++) {
    const dd = new Date(Date.now() - i * 86400000);
    try {
      const steps = (await client.getSteps(dd)) as unknown;
      if (typeof steps === "number" && steps > 0) {
        await upsertMetric(db, userId, dd.toISOString().slice(0, 10), "steps", steps);
        metricCount++;
      }
    } catch {
      /* steps unavailable */
    }
  }
  try {
    const hr = (await client.getHeartRate(day)) as unknown as { restingHeartRate?: number };
    if (typeof hr?.restingHeartRate === "number" && hr.restingHeartRate > 0) {
      await upsertMetric(db, userId, dayStr, "resting_hr", hr.restingHeartRate);
      metricCount++;
    }
  } catch {
    /* heart rate unavailable */
  }
  try {
    const sleep = (await client.getSleepData(day)) as unknown as {
      dailySleepDTO?: {
        sleepTimeSeconds?: number;
        sleepScores?: { overall?: { value?: number }; overallScore?: number };
      };
      sleepScores?: { overall?: { value?: number } };
    };
    const dto = sleep?.dailySleepDTO;
    const secs = dto?.sleepTimeSeconds;
    if (typeof secs === "number" && secs > 0) {
      await upsertMetric(db, userId, dayStr, "sleep_hours", Math.round((secs / 3600) * 10) / 10);
      metricCount++;
    }
    // Sleep score lives under a few shapes depending on device/firmware.
    const score =
      dto?.sleepScores?.overall?.value ??
      dto?.sleepScores?.overallScore ??
      sleep?.sleepScores?.overall?.value;
    if (typeof score === "number" && score > 0) {
      await upsertMetric(db, userId, dayStr, "sleep_score", score);
      metricCount++;
    }
  } catch {
    /* sleep unavailable */
  }
  // Weight: Garmin is now a one-time history backfill only. Manual entries are
  // the source of truth, so only fill dates that have no weight reading yet.
  try {
    const existing = await db
      .select({ date: metrics.date })
      .from(metrics)
      .where(and(eq(metrics.userId, userId), eq(metrics.metricType, "weight")));
    const haveWeight = new Set(existing.map((e) => e.date));
    const start = new Date(Date.now() - 220 * 86400000).toISOString().slice(0, 10);
    const end = new Date().toISOString().slice(0, 10);
    const wr = await client.get<{
      dailyWeightSummaries?: {
        summaryDate?: string;
        latestWeight?: { weight?: number };
        allWeightMetrics?: { weight?: number }[];
      }[];
    }>(`https://connectapi.garmin.com/weight-service/weight/range/${start}/${end}?includeAll=true`);
    for (const s of wr?.dailyWeightSummaries ?? []) {
      const grams = s.latestWeight?.weight ?? s.allWeightMetrics?.[0]?.weight;
      const day = s.summaryDate?.slice(0, 10);
      if (typeof grams === "number" && grams > 0 && day && !haveWeight.has(day)) {
        await upsertMetric(db, userId, day, "weight", Math.round((grams / 453.592) * 10) / 10);
        metricCount++;
      }
    }
  } catch {
    /* weight unavailable */
  }
  // Body battery for today (with recharge/drain).
  try {
    const today = new Date().toISOString().slice(0, 10);
    const profile = (await client.getUserProfile()) as unknown as { displayName?: string };
    if (profile?.displayName) {
      const s = await client.get<{
        bodyBatteryMostRecentValue?: number;
        bodyBatteryHighestValue?: number;
        bodyBatteryChargedValue?: number;
        bodyBatteryDrainedValue?: number;
      }>(`https://connectapi.garmin.com/usersummary-service/usersummary/daily/${profile.displayName}?calendarDate=${today}`);
      const bb = s?.bodyBatteryMostRecentValue ?? s?.bodyBatteryHighestValue;
      if (typeof bb === "number" && bb > 0) {
        await upsertMetric(db, userId, today, "body_battery", bb);
        metricCount++;
      }
      if (typeof s?.bodyBatteryChargedValue === "number")
        await upsertMetric(db, userId, today, "body_battery_charged", s.bodyBatteryChargedValue);
      if (typeof s?.bodyBatteryDrainedValue === "number")
        await upsertMetric(db, userId, today, "body_battery_drained", s.bodyBatteryDrainedValue);
    }
  } catch {
    /* body battery unavailable */
  }

  // Derived fitness age, from Garmin's VO2max when available, best-effort.
  await pullVo2Max(db, client, userId, new Date().toISOString().slice(0, 10));
  try {
    if (await upsertFitnessAge(db, userId)) metricCount++;
  } catch {
    /* fitness age unavailable */
  }
  await upsertMetric(db, userId, new Date().toISOString().slice(0, 10), "synced_at", Math.floor(Date.now() / 1000));

  return { activities, metrics: metricCount };
}
