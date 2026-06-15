import "server-only";
import { GarminConnect } from "garmin-connect";
import { asc } from "drizzle-orm";
import { getDb } from "../db";
import type { DB } from "../db";
import { users, workouts, metrics } from "../db/schema";

// Pulls Garmin activities + a couple of daily metrics into one user's data
// (Garmin belongs to Nick). Unofficial library, so everything is best-effort and
// deduped by the (user, source, external_id) index. RingConn is intentionally absent.
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

// HR time-series for one activity, via the details endpoint. Best-effort.
async function fetchHrSamples(
  client: GarminConnect,
  activityId: number,
): Promise<{ t: number; hr: number }[] | undefined> {
  const url = `https://connectapi.garmin.com/activity-service/activity/${activityId}/details?maxChartSize=120`;
  const data = await client.get<{
    metricDescriptors?: { metricsIndex: number; key: string }[];
    activityDetailMetrics?: { metrics: (number | null)[] }[];
  }>(url);
  const descs = data?.metricDescriptors ?? [];
  const rows = data?.activityDetailMetrics ?? [];
  const hrIdx = descs.find((d) => d.key === "directHeartRate")?.metricsIndex;
  const tIdx = descs.find((d) => d.key === "sumElapsedDuration")?.metricsIndex;
  if (hrIdx == null) return undefined;

  const samples: { t: number; hr: number }[] = [];
  rows.forEach((row, i) => {
    const hr = row.metrics?.[hrIdx];
    if (typeof hr === "number" && hr > 0) {
      const t = tIdx != null ? row.metrics?.[tIdx] : null;
      samples.push({ t: typeof t === "number" ? Math.round(t) : i, hr: Math.round(hr) });
    }
  });
  return samples.length ? samples : undefined;
}

async function targetUserId(db: DB): Promise<number> {
  const envId = process.env.GARMIN_USER_ID;
  if (envId && /^\d+$/.test(envId)) return Number.parseInt(envId, 10);
  const [first] = await db.select({ id: users.id }).from(users).orderBy(asc(users.id)).limit(1);
  return first.id;
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

export async function syncGarmin(): Promise<GarminSyncResult> {
  const username = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!username || !password) throw new Error("GARMIN_EMAIL / GARMIN_PASSWORD not set.");

  const client = new GarminConnect({ username, password });
  await client.login();

  const db = await getDb();
  const userId = await targetUserId(db);

  const acts = (await client.getActivities(0, 30)) as unknown as GarminActivity[];
  let activities = 0;
  let hrFetched = 0;
  for (const a of acts) {
    const date = (a.startTimeLocal ?? "").slice(0, 10);
    if (!date) continue;
    const type = a.activityName || a.activityType?.typeKey || "Activity";
    const durationMinutes = a.duration ? Math.round(a.duration / 60) : null;
    const detail = activityDetail(a);
    // Pull HR samples for the most recent few only (caps API calls per run).
    if (hrFetched < 8) {
      try {
        const hrSamples = await fetchHrSamples(client, a.activityId);
        if (hrSamples) detail.hrSamples = hrSamples;
      } catch {
        /* HR detail unavailable */
      }
      hrFetched++;
    }
    await db
      .insert(workouts)
      .values({ userId, date, source: "garmin", externalId: String(a.activityId), type, durationMinutes, location: "outdoor", detail })
      // Refresh stats on re-sync, but don't clobber a type the user has relabelled.
      .onConflictDoUpdate({
        target: [workouts.userId, workouts.source, workouts.externalId],
        set: { durationMinutes, detail },
      });
    activities++;
  }

  // Daily numbers, best-effort and independent — never break the activity sync.
  let metricCount = 0;
  const day = new Date(Date.now() - 86400000); // yesterday (today isn't synced yet)
  const dayStr = day.toISOString().slice(0, 10);
  // Steps for the last 7 days so the card can show a trend.
  for (let i = 1; i <= 7; i++) {
    const dd = new Date(Date.now() - i * 86400000);
    const ds = dd.toISOString().slice(0, 10);
    try {
      const steps = (await client.getSteps(dd)) as unknown;
      if (typeof steps === "number" && steps > 0) {
        await upsertMetric(db, userId, ds, "steps", steps);
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
      dailySleepDTO?: { sleepTimeSeconds?: number; sleepScores?: { overall?: { value?: number } } };
    };
    const secs = sleep?.dailySleepDTO?.sleepTimeSeconds;
    if (typeof secs === "number" && secs > 0) {
      await upsertMetric(db, userId, dayStr, "sleep_hours", Math.round((secs / 3600) * 10) / 10);
      metricCount++;
    }
    const score = sleep?.dailySleepDTO?.sleepScores?.overall?.value;
    if (typeof score === "number" && score > 0) {
      await upsertMetric(db, userId, dayStr, "sleep_score", score);
      metricCount++;
    }
  } catch {
    /* sleep unavailable */
  }
  try {
    const lbs = (await client.getDailyWeightInPounds(day)) as unknown;
    if (typeof lbs === "number" && lbs > 0) {
      await upsertMetric(db, userId, dayStr, "weight", Math.round(lbs * 10) / 10);
      metricCount++;
    }
  } catch {
    /* weight unavailable */
  }
  try {
    const profile = (await client.getUserProfile()) as unknown as { displayName?: string };
    if (profile?.displayName) {
      const summary = await client.get<{ bodyBatteryMostRecentValue?: number; bodyBatteryHighestValue?: number }>(
        `https://connectapi.garmin.com/usersummary-service/usersummary/daily/${profile.displayName}?calendarDate=${dayStr}`,
      );
      const bb = summary?.bodyBatteryMostRecentValue ?? summary?.bodyBatteryHighestValue;
      if (typeof bb === "number" && bb > 0) {
        await upsertMetric(db, userId, dayStr, "body_battery", bb);
        metricCount++;
      }
    }
  } catch {
    /* body battery unavailable */
  }

  return { activities, metrics: metricCount };
}
