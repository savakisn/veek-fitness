// Training load: a simple TRIMP-style score per session, then acute (7-day) vs
// chronic (28-day) load to give a dynamic status + target — Garmin-style, but
// honest about being an approximation from duration, heart rate, and effort.

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

export type TrainingStatus = {
  acuteWeek: number; // load over the last 7 days
  chronicWeek: number; // average weekly load over the last 28 days
  ratio: number;
  target: number; // dynamic weekly load target
  label: string;
  tone: "neutral" | "good" | "build" | "warn";
  message: string;
};

export function computeTraining(rows: LoadInput[], today: Date = new Date()): TrainingStatus {
  const t = today.getTime();
  let acute = 0;
  let chronic = 0;
  for (const r of rows) {
    const ageDays = (t - new Date(r.date + "T00:00:00").getTime()) / 86400000;
    if (ageDays < 0) continue;
    const load = sessionLoad(r);
    if (ageDays < 7) acute += load;
    if (ageDays < 28) chronic += load;
  }
  const chronicWeek = chronic / 4;
  const ratio = chronicWeek > 0 ? acute / chronicWeek : acute > 0 ? 2 : 0;
  const target = Math.max(Math.round(chronicWeek * 1.05), 120); // floor so new users have a goal

  let label = "Getting started";
  let tone: TrainingStatus["tone"] = "neutral";
  let message = "Log or sync a few sessions and your load shows up here.";
  if (chronicWeek > 0 || acute > 0) {
    if (ratio < 0.8) {
      label = "Easing off";
      message = "Your load is dipping. A couple of sessions this week keeps your base.";
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
