// TEMP STUB: replaced by p1/readiness at integration
//
// Returns a fixed sample so the Today screen can be built and screenshotted in
// every state before the real engine lands. Pick the state with
// READINESS_STUB=push|steady|easy|rest|empty (default steady). Only the signature
// matters to callers; keep it identical to the real one.
import "server-only";
import type { Readiness, Signal, Verdict } from "../readiness/types";
import { todayISO } from "../format";

type S = Pick<Signal, "key" | "label" | "unit"> & { value: number | null; baseline: number | null; z: number | null };

function sig(s: S, note: string): Signal {
  const effect: Signal["effect"] =
    s.value == null ? "missing" : s.z == null || Math.abs(s.z) < 0.5 ? "neutral" : s.z > 0 ? "good" : "bad";
  return { ...s, effect, note };
}

const hrv = (value: number | null, z: number | null) =>
  sig({ key: "hrv", label: "HRV", unit: "ms", value, baseline: value == null ? null : 58, z }, "");
const sleep = (value: number | null, z: number | null) =>
  sig({ key: "sleep", label: "Sleep", unit: "h", value, baseline: value == null ? null : 7.1, z }, "");
const rhr = (value: number | null, z: number | null) =>
  sig({ key: "resting_hr", label: "Resting HR", unit: "bpm", value, baseline: value == null ? null : 52, z }, "");
const bb = (value: number | null, z: number | null) =>
  sig({ key: "body_battery", label: "Body Battery", unit: "", value, baseline: value == null ? null : 72, z }, "");
const load = (value: number | null, z: number | null) =>
  sig({ key: "load", label: "Load", unit: "", value, baseline: value == null ? null : 340, z }, "");
const back = (value: number | null) =>
  sig({ key: "back", label: "Back", unit: "", value, baseline: null, z: value == null ? null : -value }, "");

const SAMPLES: Record<Verdict | "empty", Omit<Readiness, "date">> = {
  push: {
    verdict: "push",
    score: 86,
    confidence: "high",
    headline: "Recovered and rested. A good day to go hard.",
    signals: [hrv(69, 1.4), sleep(7.9, 0.9), rhr(49, 1.1), bb(91, 1.3), load(295, 0.4), back(0)],
    limits: { maxIntensity: "high", backSafeOnly: false, avoidCategories: [] },
  },
  steady: {
    verdict: "steady",
    score: 64,
    confidence: "high",
    headline: "Normal day. Train as planned.",
    signals: [hrv(57, -0.1), sleep(7.2, 0.1), rhr(53, -0.3), bb(70, -0.1), load(362, -0.4), back(0)],
    limits: { maxIntensity: "moderate", backSafeOnly: false, avoidCategories: [] },
  },
  easy: {
    verdict: "easy",
    score: 41,
    confidence: "medium",
    headline: "Easy day. Sleep was short and HRV is down.",
    signals: [hrv(48, -1.2), sleep(5.8, -1.5), rhr(55, -0.8), bb(46, -1.1), load(410, -0.9), back(1)],
    limits: { maxIntensity: "low", backSafeOnly: true, avoidCategories: ["strength"] },
  },
  rest: {
    verdict: "rest",
    score: 18,
    confidence: "high",
    headline: "Rest. Your back is sore and HRV is well under your norm.",
    signals: [hrv(41, -2.1), sleep(6.1, -1.0), rhr(58, -1.6), bb(29, -1.9), load(470, -1.6), back(2)],
    limits: { maxIntensity: "none", backSafeOnly: true, avoidCategories: ["strength", "sport_prep", "full_body"] },
  },
  empty: {
    verdict: "steady",
    score: null,
    confidence: "low",
    headline: "Not enough watch data yet, so this is a normal day.",
    signals: [hrv(null, null), sleep(null, null), rhr(null, null), bb(null, null), load(null, null), back(null)],
    limits: { maxIntensity: "moderate", backSafeOnly: false, avoidCategories: [] },
  },
};

export async function getReadiness(userId: number, date?: string): Promise<Readiness> {
  void userId;
  const key = process.env.READINESS_STUB as keyof typeof SAMPLES | undefined;
  const sample = SAMPLES[key && key in SAMPLES ? key : "steady"];
  return { date: date ?? todayISO(), ...sample };
}
