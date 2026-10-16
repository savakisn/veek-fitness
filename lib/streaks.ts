import { addDaysISO, isoDate, weekStartISO } from "./format";

// Weeks run Monday to Sunday in the app's zone (date-string math, so a UTC server
// doesn't close the week at 8pm ET on Sunday). Streak is forgiving: rest days never break it,
// and the current week in progress doesn't break it either. Only a finished
// week that missed the goal does.

export type StreakInfo = {
  weeklyGoal: number;
  thisWeekCount: number;
  goalMetThisWeek: boolean;
  streakWeeks: number;
  totalSessions: number;
};

export function computeStreak(
  dates: string[],
  weeklyGoal: number,
  today: Date = new Date(),
): StreakInfo {
  const counts = new Map<string, number>();
  for (const ds of dates) {
    const k = weekStartISO(ds);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const start = weekStartISO(isoDate(today));
  const thisWeekCount = counts.get(start) ?? 0;
  const goalMetThisWeek = thisWeekCount >= weeklyGoal;

  let streakWeeks = 0;
  for (let i = 1; ; i++) {
    const k = addDaysISO(start, -7 * i);
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
