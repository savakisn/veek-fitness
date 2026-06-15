import "server-only";
import { desc, asc, gte, eq, and } from "drizzle-orm";
import { getDb } from "./index";
import { workouts, routines, aiInsights, metrics } from "./schema";
import type { AiInsight, User } from "./schema";
import { getStreak, getRecentWorkouts } from "./queries";

// Latest value per metric type for a user (steps, sleep_hours, resting_hr, ...).
export async function getLatestMetrics(userId: number): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ metricType: metrics.metricType, value: metrics.value })
    .from(metrics)
    .where(eq(metrics.userId, userId))
    .orderBy(desc(metrics.date));
  const out: Record<string, number> = {};
  for (const r of rows) if (!(r.metricType in out)) out[r.metricType] = r.value;
  return out;
}

export type FitnessStats = {
  weekSessions: number;
  weeklyGoal: number;
  streakWeeks: number;
  byCategory: Record<string, number>;
  recentTypes: string[];
};

export async function getWeeklyStats(user: User): Promise<FitnessStats> {
  const db = await getDb();
  const [streak, recent] = await Promise.all([getStreak(user), getRecentWorkouts(user.id, 8)]);

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const rows = await db
    .select({ goalTag: routines.goalTag, type: workouts.type })
    .from(workouts)
    .leftJoin(routines, eq(workouts.routineId, routines.id))
    .where(and(eq(workouts.userId, user.id), gte(workouts.date, since)));

  const byCategory: Record<string, number> = {};
  for (const r of rows) {
    const k = r.goalTag ?? "other";
    byCategory[k] = (byCategory[k] ?? 0) + 1;
  }

  return {
    weekSessions: streak.thisWeekCount,
    weeklyGoal: streak.weeklyGoal,
    streakWeeks: streak.streakWeeks,
    byCategory,
    recentTypes: recent.map((w) => w.routineName ?? w.type ?? "Workout"),
  };
}

export async function getMetricSeries(
  userId: number,
  metricType: string,
  days = 7,
): Promise<{ date: string; value: number }[]> {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  return db
    .select({ date: metrics.date, value: metrics.value })
    .from(metrics)
    .where(and(eq(metrics.userId, userId), eq(metrics.metricType, metricType), gte(metrics.date, since)))
    .orderBy(asc(metrics.date));
}

export async function getLatestInsight(userId: number, kind = "weekly"): Promise<AiInsight | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(aiInsights)
    .where(and(eq(aiInsights.userId, userId), eq(aiInsights.kind, kind)))
    .orderBy(desc(aiInsights.date), desc(aiInsights.id))
    .limit(1);
  return row ?? null;
}
