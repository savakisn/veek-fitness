// The contract between the readiness engine, the Today screen and the LLM layer.
// The engine is deterministic: same inputs, same verdict. The model only explains
// and adapts inside the envelope this sets.

export type Verdict = "push" | "steady" | "easy" | "rest";

export type SignalKey = "hrv" | "sleep" | "resting_hr" | "body_battery" | "load" | "back";

export type Signal = {
  key: SignalKey;
  label: string; // "HRV", "Sleep", ...
  value: number | null; // today's reading
  unit: string; // "ms", "h", "bpm", "", ...
  baseline: number | null; // personal 28-day mean, null until enough history
  z: number | null; // (value - baseline) / sd, sign flipped so positive is always "more ready"
  effect: "good" | "bad" | "neutral" | "missing";
  note: string; // one short plain sentence, e.g. "6.1 h, 0.9 h under your norm"
};

export type Readiness = {
  date: string; // ISO day in the app time zone
  verdict: Verdict;
  score: number | null; // 0-100, null when there is too little data to score
  confidence: "low" | "medium" | "high"; // from how many signals have a baseline
  headline: string; // deterministic one-liner, e.g. "Easy day. Sleep was short."
  signals: Signal[];
  // Hard limits the plan must respect. The model may pick inside them, never outside.
  limits: {
    maxIntensity: "none" | "low" | "moderate" | "high";
    backSafeOnly: boolean;
    avoidCategories: string[]; // exercise categories to skip today, e.g. ["strength"]
  };
};

export type DaySeries = { date: string; value: number }[];

export type ReadinessInput = {
  today: string;
  // Keyed by metric_type (see lib/metric-keys.ts), ascending by date, up to ~60 days.
  series: Record<string, DaySeries>;
  // Sessions over the last ~42 days for load.
  workouts: { date: string; durationMinutes: number | null; perceivedEffort: number | null; avgHr?: number | null; category?: string | null }[];
};
