// Training load: a simple TRIMP-style score per session, then acute (7-day) vs
// chronic (28-day) EWMA load to give a dynamic status + target, Garmin-style but
// honest about being an approximation from duration, heart rate, and effort.
import { ewmaLoads } from "./readiness/engine";
import { addDaysISO, todayISO } from "./format";

export type LoadInput = {
  date: string;
  durationMinutes: number | null;
  perceivedEffort: number | null;
  detail: { avgHr?: number } | null;
};

export function sessionLoad(w: LoadInput): number {
  const dur = w.durationMinutes ?? 30;
  let intensity = 0.8; // default moderate
  if (w.detail?.avgHr) intensity = Math.min(1.6, Math.max(0.4, (w.detail.avgHr - 80) / 80));
  else if (w.perceivedEffort) intensity = w.perceivedEffort / 3;
  return Math.round(dur * intensity);
}

// Daily steps as a load contribution, so walking counts for someone whose
// activity isn't recorded workouts. ~9k steps ≈ a solid 60-point day.
export function stepLoad(steps: number): number {
  if (!steps || steps <= 0) return 0;
  return Math.round(steps / 150);
}

export type TrainingStatus = {
  acuteWeek: number; // load over the last 7 days
  chronicWeek: number; // average weekly load over the last 28 days
  ratio: number;
  target: number; // dynamic weekly load target
  label: string;
  tone: "neutral" | "good" | "build" | "warn";
  message: string;
};

// How many days of history the training card reads; the chronic EWMA needs the
// five weeks before the acute week to settle.
export const TRAINING_DAYS = 42;

export function computeTraining(
  rows: LoadInput[],
  stepDays: { date: string; steps: number }[] = [],
  today: Date = new Date(),
): TrainingStatus {
  const end = todayISO(today);
  const start = addDaysISO(end, -(TRAINING_DAYS - 1));
  const byDay = new Map<string, number>();
  const add = (date: string, load: number) => {
    if (date < start || date > end) return;
    byDay.set(date, (byDay.get(date) ?? 0) + load);
  };
  for (const r of rows) add(r.date, sessionLoad(r));
  for (const s of stepDays) add(s.date, stepLoad(s.steps));
  const daily: number[] = [];
  for (let i = TRAINING_DAYS - 1; i >= 0; i--) daily.push(byDay.get(addDaysISO(end, -i)) ?? 0);

  // Uncoupled EWMA (7-day acute, 28-day chronic that ends before the acute week),
  // scaled to weekly totals so the card's numbers read like before.
  const ew = ewmaLoads(daily);
  const acute = ew.acute * 7;
  const chronicWeek = ew.chronic * 7;
  const ratio = chronicWeek > 0 ? acute / chronicWeek : acute > 0 ? 2 : 0;
  const target = Math.max(Math.round(chronicWeek * 1.05), 120); // floor so new users have a goal

  let label = "Getting started";
  let tone: TrainingStatus["tone"] = "neutral";
  let message = "Move a little or log a session and your load shows up here.";
  if (chronicWeek === 0 && acute > 0) {
    // Nothing before this week to compare against, so no ratio verdict yet.
    label = "Building a base";
    message = "Keep it up. Your trend shows once there are a few weeks to compare.";
  } else if (chronicWeek > 0 || acute > 0) {
    if (ratio < 0.8) {
      label = "Easing off";
      message = "Your activity dipped this week. A bit more movement keeps your base.";
    } else if (ratio <= 1.3) {
      label = "On track";
      tone = "good";
      message = "Sustainable, productive load. Keep this rhythm.";
    } else if (ratio <= 1.5) {
      label = "Building";
      tone = "build";
      message = "Ramping up nicely. Fine for now, just don't spike it further.";
    } else {
      label = "Overreaching";
      tone = "warn";
      message = "Big jump in load. Ease back and let it absorb.";
    }
  }

  return {
    acuteWeek: Math.round(acute),
    chronicWeek: Math.round(chronicWeek),
    ratio: Math.round(ratio * 100) / 100,
    target,
    label,
    tone,
    message,
  };
}
