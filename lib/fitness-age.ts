import "server-only";
import { desc, eq, and } from "drizzle-orm";
import type { DB } from "./db";
import { metrics, workouts } from "./db/schema";

// Nick's static profile (only he has Garmin). Birthdate keeps age current.
const BIRTH_DATE = "1999-03-15"; // ~27 in mid-2026
const HEIGHT_IN = 70.5;

function ageNow(): number {
  const ms = Date.now() - new Date(BIRTH_DATE).getTime();
  return ms / (365.25 * 86400000);
}

async function latest(db: DB, userId: number, type: string): Promise<number | null> {
  const [row] = await db
    .select({ value: metrics.value })
    .from(metrics)
    .where(and(eq(metrics.userId, userId), eq(metrics.metricType, type)))
    .orderBy(desc(metrics.date))
    .limit(1);
  return row?.value ?? null;
}

// Live, no-lab fitness age. VO2max from the Heart Rate Ratio method
// (Uth-Sorensen 2004: VO2max ~= 15 * HRmax/HRrest), mapped to male population
// norms (median VO2max ~= 56 - 0.4*age), then nudged by BMI. Resting HR is
// already baked into VO2max, so we don't double-count it.
export async function computeFitnessAge(db: DB, userId: number): Promise<number | null> {
  const hrRest = await latest(db, userId, "resting_hr");
  if (!hrRest || hrRest <= 0) return null;

  const age = ageNow();
  // Best HRmax we have: the highest activity max HR; else age-predicted (Nes).
  const acts = await db
    .select({ detail: workouts.detail })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.source, "garmin")));
  let hrMax = 0;
  for (const a of acts) if (a.detail?.maxHr && a.detail.maxHr > hrMax) hrMax = a.detail.maxHr;
  if (hrMax < 120) hrMax = Math.round(211 - 0.64 * age);

  const vo2 = 15 * (hrMax / hrRest);
  let fa = (56 - vo2) / 0.4; // invert the male norm line

  const weight = await latest(db, userId, "weight"); // lbs
  if (weight && weight > 0) {
    const bmi = (703 * weight) / (HEIGHT_IN * HEIGHT_IN);
    if (bmi > 25) fa += (bmi - 25) * 0.6;
    else if (bmi < 18.5) fa += (18.5 - bmi) * 0.6;
  }

  fa = Math.max(16, Math.min(80, fa));
  return Math.round(fa);
}

export async function upsertFitnessAge(db: DB, userId: number): Promise<boolean> {
  const fa = await computeFitnessAge(db, userId);
  if (fa == null) return false;
  const today = new Date().toISOString().slice(0, 10);
  await db
    .insert(metrics)
    .values({ userId, date: today, metricType: "fitness_age", value: fa, source: "derived" })
    .onConflictDoUpdate({
      target: [metrics.userId, metrics.date, metrics.metricType, metrics.source],
      set: { value: fa },
    });
  return true;
}
