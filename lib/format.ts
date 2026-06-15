export const GOAL_LABELS: Record<string, string> = {
  mobility: "Mobility",
  core: "Core",
  full_body: "Full body",
  recovery: "Recovery",
  sport_prep: "Sport prep",
  strength: "Strength",
  yoga: "Yoga",
  pilates: "Pilates",
};

export function goalLabel(tag: string): string {
  return GOAL_LABELS[tag] ?? tag;
}

// Local-time ISO date (YYYY-MM-DD), so "today" matches the user's day, not UTC.
export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function prettyDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function prescription(item: {
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
}): string {
  if (item.durationSeconds) {
    const s = item.durationSeconds;
    return s >= 60 ? `${Math.round(s / 60)} min` : `${s}s`;
  }
  if (item.sets && item.reps) return `${item.sets} × ${item.reps}`;
  if (item.reps) return `${item.reps} reps`;
  return "";
}
