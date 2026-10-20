import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "./index";
import { metrics, routines, workouts } from "./schema";
import { computeReadiness } from "../readiness/engine";
import { buildReadinessInput, METRIC_DAYS, WORKOUT_DAYS } from "../readiness/input";
import type { Readiness } from "../readiness/types";
import { addDaysISO, todayISO } from "../format";

// Today's readiness (or a past day's, from what was on file up to that day).
export async function getReadiness(userId: number, date?: string): Promise<Readiness> {
  const db = await getDb();
  const today = date ?? todayISO();
  const [metricRows, workoutRows] = await Promise.all([
    db
      .select({ date: metrics.date, metricType: metrics.metricType, value: metrics.value, source: metrics.source })
      .from(metrics)
      .where(and(eq(metrics.userId, userId), gte(metrics.date, addDaysISO(today, -METRIC_DAYS)), lte(metrics.date, today))),
    db
      .select({
        date: workouts.date,
        durationMinutes: workouts.durationMinutes,
        perceivedEffort: workouts.perceivedEffort,
        detail: workouts.detail,
        type: workouts.type,
        goalTag: routines.goalTag,
      })
      .from(workouts)
      .leftJoin(routines, eq(workouts.routineId, routines.id))
      .where(and(eq(workouts.userId, userId), gte(workouts.date, addDaysISO(today, -WORKOUT_DAYS)), lte(workouts.date, today))),
  ]);
  const input = buildReadinessInput(
    today,
    metricRows,
    workoutRows.map((w) => ({ ...w, avgHr: w.detail?.avgHr ?? null })),
  );
  return computeReadiness(input);
}
