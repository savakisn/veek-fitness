// Raw rows to ReadinessInput. Pure so the app and the backtest build the input the
// same way, and so the backtest can cut history at any past day.
import { METRIC } from "../metric-keys";
import type { DaySeries, ReadinessInput } from "./types";
import { addDays } from "./engine";

export type MetricRow = { date: string; metricType: string; value: number; source: string };
export type WorkoutRow = {
  date: string;
  durationMinutes: number | null;
  perceivedEffort: number | null;
  avgHr?: number | null;
  goalTag?: string | null;
  type?: string | null;
};

export const METRIC_DAYS = 60;
export const WORKOUT_DAYS = 42;

// Self-reported back status is manual; for watch numbers Garmin wins when a day has both.
function preferred(metricType: string, source: string): number {
  if (metricType === METRIC.backStatus) return source === "manual" ? 2 : 1;
  return source === "garmin" ? 2 : 1;
}

// Only rows on or before today count, so a backtest never sees the future.
export function buildReadinessInput(today: string, metricRows: MetricRow[], workoutRows: WorkoutRow[]): ReadinessInput {
  const mFrom = addDays(today, -METRIC_DAYS);
  const best = new Map<string, Map<string, { value: number; rank: number }>>();
  for (const r of metricRows) {
    if (r.date < mFrom || r.date > today || !Number.isFinite(r.value)) continue;
    const byDate = best.get(r.metricType) ?? new Map<string, { value: number; rank: number }>();
    const rank = preferred(r.metricType, r.source);
    const prev = byDate.get(r.date);
    if (!prev || rank > prev.rank) byDate.set(r.date, { value: r.value, rank });
    best.set(r.metricType, byDate);
  }
  const series: Record<string, DaySeries> = {};
  for (const [type, byDate] of best) {
    series[type] = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([date, v]) => ({ date, value: v.value }));
  }

  const wFrom = addDays(today, -WORKOUT_DAYS);
  const workouts = workoutRows
    .filter((w) => w.date >= wFrom && w.date <= today)
    .map((w) => ({
      date: w.date,
      durationMinutes: w.durationMinutes,
      perceivedEffort: w.perceivedEffort,
      avgHr: w.avgHr ?? null,
      category: w.goalTag ?? w.type ?? null,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return { today, series, workouts };
}
