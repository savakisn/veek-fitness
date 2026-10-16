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

// Both users live in Connecticut. Servers run on UTC, so every "what day is it"
// goes through this zone; otherwise after 8pm ET "today" is already tomorrow.
export const APP_TZ = "America/New_York";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: APP_TZ, hour: "numeric", hourCycle: "h23" });

// The calendar date (YYYY-MM-DD) of an instant, in the app's zone.
export function isoDate(d: Date): string {
  return dayFmt.format(d);
}

export function todayISO(d: Date = new Date()): string {
  return isoDate(d);
}

export function daysAgoISO(n: number): string {
  return isoDate(new Date(Date.now() - n * 86400000));
}

// Monday of the week containing the given date (date-string math, zone-free).
export function weekStartISO(iso: string = todayISO()): string {
  const d = new Date(iso + "T00:00:00Z");
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * 86400000).toISOString().slice(0, 10);
}

export function localHour(d: Date = new Date()): number {
  return Number(hourFmt.format(d));
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
