import { startOfWeek, subWeeks, parseISO } from "date-fns";

// Weeks run Monday to Sunday. Streak is forgiving: rest days never break it,
// and the current week in progress doesn't break it either. Only a finished
// week that missed the goal does.

export type StreakInfo = {
  weeklyGoal: number;
  thisWeekCount: number;
  goalMetThisWeek: boolean;
  streakWeeks: number;
  totalSessions: number;
};

function weekKey(d: Date): string {
  return startOfWeek(d, { weekStartsOn: 1 }).toISOString().slice(0, 10);
}

export function computeStreak(
  dates: string[],
  weeklyGoal: number,
  today: Date = new Date(),
): StreakInfo {
  const counts = new Map<string, number>();
  for (const ds of dates) {
    const k = weekKey(parseISO(ds));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const start = startOfWeek(today, { weekStartsOn: 1 });
  const thisWeekCount = counts.get(weekKey(start)) ?? 0;
  const goalMetThisWeek = thisWeekCount >= weeklyGoal;

  let streakWeeks = 0;
  for (let i = 1; ; i++) {
    const k = weekKey(subWeeks(start, i));
    if ((counts.get(k) ?? 0) >= weeklyGoal) streakWeeks++;
    else break;
  }
  if (goalMetThisWeek) streakWeeks++;

  return {
    weeklyGoal,
    thisWeekCount,
    goalMetThisWeek,
    streakWeeks,
    totalSessions: dates.length,
  };
}
