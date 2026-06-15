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

export type FitnessAgeBreakdown = {
  age: number;
  hrRest: number;
  hrMax: number;
  hrMaxEstimated: boolean;
  vo2max: number;
  baseAge: number; // from VO2max alone
  bmi: number | null;
  bmiAdjust: number;
  fitnessAge: number;
};

// Live, no-lab fitness age. VO2max from the Heart Rate Ratio method
// (Uth-Sorensen 2004: VO2max ~= 15 * HRmax/HRrest), mapped to male population
// norms (median VO2max ~= 56 - 0.4*age), then nudged by BMI. Resting HR is
// already baked into VO2max, so we don't double-count it.
export async function fitnessAgeBreakdown(db: DB, userId: number): Promise<FitnessAgeBreakdown | null> {
  const hrRest = await latest(db, userId, "resting_hr");
  if (!hrRest || hrRest <= 0) return null;

  const age = ageNow();
  const acts = await db
    .select({ detail: workouts.detail })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.source, "garmin")));
  let hrMax = 0;
  for (const a of acts) if (a.detail?.maxHr && a.detail.maxHr > hrMax) hrMax = a.detail.maxHr;
  const hrMaxEstimated = hrMax < 120;
  if (hrMaxEstimated) hrMax = Math.round(211 - 0.64 * age);

  const vo2max = 15 * (hrMax / hrRest);
  const baseAge = (56 - vo2max) / 0.4;

  let bmi: number | null = null;
  let bmiAdjust = 0;
  const weight = await latest(db, userId, "weight"); // lbs
  if (weight && weight > 0) {
    bmi = (703 * weight) / (HEIGHT_IN * HEIGHT_IN);
    if (bmi > 25) bmiAdjust = (bmi - 25) * 0.6;
    else if (bmi < 18.5) bmiAdjust = (18.5 - bmi) * 0.6;
  }

  const fitnessAge = Math.max(16, Math.min(80, Math.round(baseAge + bmiAdjust)));
  return {
    age: Math.round(age * 10) / 10,
    hrRest: Math.round(hrRest),
    hrMax: Math.round(hrMax),
    hrMaxEstimated,
    vo2max: Math.round(vo2max * 10) / 10,
    baseAge: Math.round(baseAge),
    bmi: bmi == null ? null : Math.round(bmi * 10) / 10,
    bmiAdjust: Math.round(bmiAdjust * 10) / 10,
    fitnessAge,
  };
}

export async function upsertFitnessAge(db: DB, userId: number): Promise<boolean> {
  const b = await fitnessAgeBreakdown(db, userId);
  if (!b) return false;
  const today = new Date().toISOString().slice(0, 10);
  await db
    .insert(metrics)
    .values({ userId, date: today, metricType: "fitness_age", value: b.fitnessAge, source: "derived" })
    .onConflictDoUpdate({
      target: [metrics.userId, metrics.date, metrics.metricType, metrics.source],
      set: { value: b.fitnessAge },
    });
  return true;
}
