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
};

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
  for (const a of acts) {
    const date = (a.startTimeLocal ?? "").slice(0, 10);
    if (!date) continue;
    await db
      .insert(workouts)
      .values({
        userId,
        date,
        source: "garmin",
        externalId: String(a.activityId),
        type: a.activityName || a.activityType?.typeKey || "Activity",
        durationMinutes: a.duration ? Math.round(a.duration / 60) : null,
        location: "outdoor",
      })
      .onConflictDoNothing();
    activities++;
  }

  // Daily numbers for today, best-effort — never let these break the activity sync.
  let metricCount = 0;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const steps = (await client.getSteps(new Date())) as unknown;
    if (typeof steps === "number") {
      await upsertMetric(db, userId, today, "steps", steps);
      metricCount++;
    }
  } catch {
    /* steps unavailable */
  }
  try {
    const hr = (await client.getHeartRate(new Date())) as unknown as { restingHeartRate?: number };
    if (typeof hr?.restingHeartRate === "number") {
      await upsertMetric(db, userId, today, "resting_hr", hr.restingHeartRate);
      metricCount++;
    }
  } catch {
    /* heart rate unavailable */
  }

  return { activities, metrics: metricCount };
}
