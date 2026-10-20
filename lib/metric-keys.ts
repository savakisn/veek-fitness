// Every metric_type the app reads or writes, in one place, so the Garmin sync, the
// readiness engine and the screens agree on names. Values live in the metrics table.
export const METRIC = {
  steps: "steps",
  restingHr: "resting_hr",
  sleepHours: "sleep_hours",
  sleepScore: "sleep_score",
  bodyBattery: "body_battery", // morning high when known, else latest
  bodyBatteryHigh: "body_battery_high",
  weight: "weight",
  vo2max: "vo2max",
  // Overnight HRV from the watch (ms). Fenix 6 has HRV Status since 2022 firmware.
  hrvOvernight: "hrv_overnight",
  hrvWeeklyAvg: "hrv_weekly_avg",
  // Garmin's own acute load (EPOC based) and training status, when the sync finds them.
  acuteLoad: "acute_load",
  stressAvg: "stress_avg",
  // Self-reported back, 0 fine, 1 tight, 2 sore. Source "manual".
  backStatus: "back_status",
} as const;

export type MetricKey = (typeof METRIC)[keyof typeof METRIC];
