import "server-only";
import { desc, gte, eq } from "drizzle-orm";
import { getDb } from "./index";
import { workouts, routines, aiInsights } from "./schema";
import type { AiInsight } from "./schema";
import { getStreak, getRecentWorkouts } from "./queries";

export type FitnessStats = {
  weekSessions: number;
  weeklyGoal: number;
  streakWeeks: number;
  byCategory: Record<string, number>;
  recentTypes: string[];
};

export async function getWeeklyStats(): Promise<FitnessStats> {
  const db = await getDb();
  const [streak, recent] = await Promise.all([getStreak(), getRecentWorkouts(8)]);

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const rows = await db
    .select({ goalTag: routines.goalTag, type: workouts.type })
    .from(workouts)
    .leftJoin(routines, eq(workouts.routineId, routines.id))
    .where(gte(workouts.date, since));

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

export async function getLatestInsight(kind = "weekly"): Promise<AiInsight | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(aiInsights)
    .where(eq(aiInsights.kind, kind))
    .orderBy(desc(aiInsights.date), desc(aiInsights.id))
    .limit(1);
  return row ?? null;
}
