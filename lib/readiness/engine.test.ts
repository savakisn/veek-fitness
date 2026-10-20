import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, computeReadiness, loadState, loadZ, robustBaseline, verdictCode, READINESS } from "./engine";
import { buildReadinessInput } from "./input";
import { METRIC } from "../metric-keys";
import type { DaySeries, ReadinessInput, Signal } from "./types";

const TODAY = "2026-10-20";

// n days of history ending yesterday, values from f(i) where i=1 is yesterday.
function hist(n: number, f: (i: number) => number): DaySeries {
  const out: DaySeries = [];
  for (let i = n; i >= 1; i--) out.push({ date: addDays(TODAY, -i), value: f(i) });
  return out;
}

// Small deterministic wobble so baselines have a real spread.
const wob = (i: number, amp: number) => ((i * 7) % 5 - 2) * (amp / 2);

function withToday(s: DaySeries, v: number | null): DaySeries {
  return v == null ? s : [...s, { date: TODAY, value: v }];
}

type Today = { hrv?: number | null; sleep?: number | null; score?: number | null; rhr?: number | null; bb?: number | null; back?: number | null };

function input(t: Today, days = 28, extra: Partial<ReadinessInput> = {}): ReadinessInput {
  const series: Record<string, DaySeries> = {
    [METRIC.hrvOvernight]: withToday(hist(days, (i) => 60 + wob(i, 4)), t.hrv === undefined ? 60 : t.hrv),
    [METRIC.sleepHours]: withToday(hist(days, (i) => 7.5 + wob(i, 0.4)), t.sleep === undefined ? 7.5 : t.sleep),
    [METRIC.restingHr]: withToday(hist(days, (i) => 52 + wob(i, 2)), t.rhr === undefined ? 52 : t.rhr),
    [METRIC.bodyBatteryHigh]: withToday(hist(days, (i) => 80 + wob(i, 6)), t.bb === undefined ? 80 : t.bb),
  };
  if (t.score !== undefined) series[METRIC.sleepScore] = withToday(hist(days, (i) => 80 + wob(i, 6)), t.score);
  if (t.back != null) series[METRIC.backStatus] = [{ date: TODAY, value: t.back }];
  return { today: TODAY, series, workouts: [], ...extra };
}

const sig = (r: ReturnType<typeof computeReadiness>, k: Signal["key"]) => r.signals.find((s) => s.key === k)!;

// Steady load: 45 min at effort 3 every other day for 42 days.
function steadyWorkouts(): ReadinessInput["workouts"] {
  const out: ReadinessInput["workouts"] = [];
  for (let i = 41; i >= 1; i -= 2) out.push({ date: addDays(TODAY, -i), durationMinutes: 45, perceivedEffort: 3 });
  return out;
}

test("no data: no score, steady, low confidence, honest headline", () => {
  const r = computeReadiness({ today: TODAY, series: {}, workouts: [] });
  assert.equal(r.score, null);
  assert.equal(r.verdict, "steady");
  assert.equal(r.confidence, "low");
  assert.equal(r.headline, "Not enough history yet; going by feel.");
  assert.equal(r.signals.length, 6);
  assert.ok(r.signals.every((s) => s.effect === "missing"));
  assert.deepEqual(r.limits, { maxIntensity: "moderate", backSafeOnly: false, avoidCategories: [] });
});

test("under 7 baseline days: building a baseline, no score", () => {
  const r = computeReadiness(input({}, 6));
  assert.equal(r.score, null);
  assert.equal(r.confidence, "low");
  const hrv = sig(r, "hrv");
  assert.equal(hrv.z, null);
  assert.equal(hrv.effect, "neutral");
  assert.match(hrv.note, /Building a baseline \(6 of 7 days\)/);
});

test("exactly 7 baseline days is enough", () => {
  const r = computeReadiness(input({}, 7));
  assert.notEqual(r.score, null);
  assert.equal(r.confidence, "high");
});

test("partial data: two signals give medium confidence and a score", () => {
  const i = input({});
  delete i.series[METRIC.hrvOvernight];
  delete i.series[METRIC.bodyBatteryHigh];
  const r = computeReadiness(i);
  assert.equal(r.confidence, "medium");
  assert.notEqual(r.score, null);
  assert.equal(sig(r, "hrv").effect, "missing");
});

test("one signal only: low confidence, no score", () => {
  const i = input({});
  i.series = { [METRIC.restingHr]: i.series[METRIC.restingHr] };
  const r = computeReadiness(i);
  assert.equal(r.confidence, "low");
  assert.equal(r.score, null);
  assert.equal(r.verdict, "steady");
});

test("today's reading missing: signal is missing, not zero", () => {
  const r = computeReadiness(input({ hrv: null }));
  const hrv = sig(r, "hrv");
  assert.equal(hrv.value, null);
  assert.equal(hrv.effect, "missing");
  assert.equal(hrv.note, "No reading today.");
  assert.equal(r.confidence, "medium"); // sleep, rhr, bb = 3
});

test("normal day: steady, score near 60, everything near norm", () => {
  const r = computeReadiness(input({}));
  assert.equal(r.verdict, "steady");
  assert.ok(r.score! >= 55 && r.score! <= 65, `score ${r.score}`);
  assert.equal(r.headline, "Steady day. Everything is near your norm.");
});

test("today is excluded from its own baseline", () => {
  const i = input({ rhr: 70 });
  const b = robustBaseline(i.series[METRIC.restingHr], TODAY, METRIC.restingHr)!;
  assert.equal(b.n, 28);
  assert.ok(Math.abs(b.center - 52) < 1);
});

test("baseline window is 28 days: older points are ignored", () => {
  const s = [...hist(60, (i) => (i > 28 ? 100 : 50))];
  const b = robustBaseline(s, TODAY, METRIC.restingHr)!;
  assert.equal(b.center, 50);
  assert.equal(b.n, 28);
});

test("sd floor keeps a flat baseline from exploding z", () => {
  const flat = withToday(hist(28, () => 7.5), 7.3);
  const b = robustBaseline(flat, TODAY, METRIC.sleepHours)!;
  assert.equal(b.sd, READINESS.sdFloor[METRIC.sleepHours]);
  const r = computeReadiness({ today: TODAY, series: { [METRIC.sleepHours]: flat, [METRIC.restingHr]: withToday(hist(28, () => 52), 52) }, workouts: [] });
  assert.equal(sig(r, "sleep").z, -0.5);
  assert.equal(r.verdict, "steady");
});

test("hrv sd floor scales with the median", () => {
  const b = robustBaseline(hist(28, () => 120), TODAY, METRIC.hrvOvernight)!;
  assert.ok(Math.abs(b.sd - 7.2) < 1e-9);
});

test("z is clamped to +-3", () => {
  const r = computeReadiness(input({ rhr: 90 }));
  assert.equal(sig(r, "resting_hr").z, -3);
});

test("signs: higher HRV, more sleep, lower RHR, higher body battery are all positive", () => {
  const r = computeReadiness(input({ hrv: 70, sleep: 8.3, rhr: 48, bb: 92 }));
  for (const k of ["hrv", "sleep", "resting_hr", "body_battery"] as const) {
    assert.ok(sig(r, k).z! > 0, `${k} z ${sig(r, k).z}`);
    assert.equal(sig(r, k).effect, "good");
  }
});

test("each bad direction is negative", () => {
  const r = computeReadiness(input({ hrv: 50, sleep: 6.3, rhr: 57, bb: 65 }));
  for (const k of ["hrv", "sleep", "resting_hr", "body_battery"] as const) {
    assert.ok(sig(r, k).z! < 0, `${k} z ${sig(r, k).z}`);
    assert.equal(sig(r, k).effect, "bad");
  }
});

test("good across the board: push, high intensity, named reasons", () => {
  const r = computeReadiness(input({ hrv: 68, sleep: 8.2, rhr: 49, bb: 90 }));
  assert.equal(r.verdict, "push");
  assert.equal(r.limits.maxIntensity, "high");
  assert.ok(r.score! > 70);
  assert.match(r.headline, /^Push day\. /);
});

test("short sleep and high RHR: easy with a plain headline", () => {
  const r = computeReadiness(input({ sleep: 6.3, rhr: 57 }));
  assert.equal(r.verdict, "easy");
  assert.equal(r.limits.maxIntensity, "low");
  assert.equal(r.headline, "Easy day. Sleep ran 1.2 h short and resting HR is up 5.");
  assert.ok(!r.headline.includes("—"));
});

test("very bad HRV and RHR together: rest", () => {
  const r = computeReadiness(input({ hrv: 45, rhr: 60 }));
  assert.equal(r.verdict, "rest");
  assert.equal(r.limits.maxIntensity, "none");
});

test("three strongly bad signals: rest even if the mean is milder", () => {
  const r = computeReadiness(input({ hrv: 53, sleep: 6.8, rhr: 55.5, bb: 92 }));
  assert.equal(r.verdict, "rest");
});

test("one alarming core signal caps at easy even when the rest is fine", () => {
  const r = computeReadiness(input({ hrv: 68, sleep: 8.2, rhr: 57, bb: 90 }));
  assert.equal(sig(r, "resting_hr").z! <= -2, true);
  assert.equal(r.verdict, "easy");
});

test("sleep score and hours are averaged into one sleep signal", () => {
  const a = computeReadiness(input({ sleep: 6.7, score: 80 }));
  const b = computeReadiness(input({ sleep: 6.7 }));
  assert.ok(sig(a, "sleep").z! > sig(b, "sleep").z!);
  assert.equal(a.signals.filter((s) => s.key === "sleep").length, 1);
});

test("sleep score alone is used when hours are missing", () => {
  const i = input({ sleep: null, score: 60 });
  const r = computeReadiness(i);
  assert.equal(sig(r, "sleep").unit, "");
  assert.ok(sig(r, "sleep").z! < 0);
});

test("body battery falls back to the plain series when high is absent", () => {
  const i = input({});
  delete i.series[METRIC.bodyBatteryHigh];
  i.series[METRIC.bodyBattery] = withToday(hist(28, () => 70), 50);
  const r = computeReadiness(i);
  assert.ok(sig(r, "body_battery").z! < 0);
});

test("sore back: at most easy, back-safe only, no strength", () => {
  const r = computeReadiness(input({ hrv: 68, sleep: 8.2, rhr: 49, bb: 90, back: 2 }));
  assert.equal(r.verdict, "easy");
  assert.deepEqual(r.limits, { maxIntensity: "low", backSafeOnly: true, avoidCategories: ["strength"] });
  assert.match(r.headline, /^Easy day\. Your back is sore/);
});

test("sore back plus other bad signals: rest", () => {
  const r = computeReadiness(input({ sleep: 6.3, rhr: 57, back: 2 }));
  assert.equal(r.verdict, "rest");
  assert.equal(r.limits.maxIntensity, "none");
  assert.equal(r.limits.backSafeOnly, true);
});

test("sore back with no history still limits the day", () => {
  const r = computeReadiness({ today: TODAY, series: { [METRIC.backStatus]: [{ date: TODAY, value: 2 }] }, workouts: [] });
  assert.equal(r.score, null);
  assert.equal(r.verdict, "easy");
  assert.equal(r.limits.maxIntensity, "low");
  assert.ok(r.headline.includes("Not enough history yet"));
});

test("tight back: moderate at most, back-safe only", () => {
  const r = computeReadiness(input({ hrv: 68, sleep: 8.2, rhr: 49, bb: 90, back: 1 }));
  assert.equal(r.verdict, "steady");
  assert.deepEqual(r.limits, { maxIntensity: "moderate", backSafeOnly: true, avoidCategories: [] });
});

test("back is a limit, not a weight: score is unchanged", () => {
  const a = computeReadiness(input({ back: 2 }));
  const b = computeReadiness(input({}));
  assert.equal(a.score, b.score);
});

test("back status older than 2 days is ignored; latest within window wins", () => {
  const i = input({});
  i.series[METRIC.backStatus] = [{ date: addDays(TODAY, -2), value: 2 }];
  assert.equal(computeReadiness(i).limits.backSafeOnly, false);
  i.series[METRIC.backStatus] = [
    { date: addDays(TODAY, -1), value: 2 },
    { date: TODAY, value: 0 },
  ];
  const r = computeReadiness(i);
  assert.equal(r.limits.backSafeOnly, false);
  assert.equal(sig(r, "back").effect, "good");
});

test("steady load gives a ratio near 1 and no load penalty", () => {
  const s = loadState(input({}, 28, { workouts: steadyWorkouts() }))!;
  assert.equal(s.source, "sessions");
  assert.ok(s.ratio > 0.85 && s.ratio < 1.15, `ratio ${s.ratio}`);
});

test("load spike drops the verdict and blocks push", () => {
  const w = steadyWorkouts();
  for (let i = 6; i >= 0; i--) w.push({ date: addDays(TODAY, -i), durationMinutes: 90, perceivedEffort: 5 });
  const r = computeReadiness(input({ hrv: 66, sleep: 8, rhr: 50, bb: 88 }, 28, { workouts: w }));
  const load = sig(r, "load");
  assert.ok(load.value! > 1.5, `ratio ${load.value}`);
  assert.ok(load.z! < -1);
  assert.notEqual(r.verdict, "push");
  assert.match(load.note, /sharp jump/);
});

test("uncoupled: a hard week does not dilute its own chronic", () => {
  // Only the last week is hard; the chronic stops before it.
  const w = steadyWorkouts();
  for (let i = 6; i >= 0; i--) w.push({ date: addDays(TODAY, -i), durationMinutes: 60, perceivedEffort: 4 });
  // The steady pattern is 45 load every other day, 22.5 a day.
  const now = loadState({ today: TODAY, series: {}, workouts: w })!;
  assert.ok(Math.abs(now.chronic - 22.5) / 22.5 < 0.1, `chronic ${now.chronic}`);
  assert.ok(now.acute > now.chronic * 2);
});

test("load needs 21 days of session history", () => {
  const w = [{ date: addDays(TODAY, -10), durationMinutes: 60, perceivedEffort: 3 }];
  assert.equal(loadState({ today: TODAY, series: {}, workouts: w }), null);
});

test("heart rate beats effort for session intensity", () => {
  const easyHr = steadyWorkouts().map((x) => ({ ...x, avgHr: 100 }));
  const hardHr = steadyWorkouts().map((x) => ({ ...x, avgHr: 170 }));
  const a = loadState({ today: TODAY, series: {}, workouts: easyHr })!;
  const b = loadState({ today: TODAY, series: {}, workouts: hardHr })!;
  assert.ok(b.acute > a.acute * 2.5);
});

test("Garmin acute load is used when present", () => {
  const g = withToday(hist(35, () => 300), 480);
  const s = loadState({ today: TODAY, series: { [METRIC.acuteLoad]: g }, workouts: [] })!;
  assert.equal(s.source, "garmin");
  assert.equal(s.ratio, 1.6);
});

test("loadZ shape", () => {
  assert.equal(loadZ(1), 0);
  assert.equal(loadZ(1.5), -2);
  assert.equal(loadZ(0.5), 0.5);
  assert.equal(loadZ(0.9), 0.2);
  assert.equal(loadZ(3), -3);
});

test("deterministic: same input, same output", () => {
  const i = input({ sleep: 6.5, rhr: 55 }, 28, { workouts: steadyWorkouts() });
  const a = computeReadiness(i);
  const b = computeReadiness(structuredClone(i));
  assert.deepEqual(a, b);
});

test("future rows are ignored by the input builder", () => {
  const rows = [
    { date: TODAY, metricType: METRIC.restingHr, value: 52, source: "garmin" },
    { date: addDays(TODAY, 1), metricType: METRIC.restingHr, value: 80, source: "garmin" },
  ];
  const i = buildReadinessInput(TODAY, rows, [{ date: addDays(TODAY, 2), durationMinutes: 30, perceivedEffort: 3 }]);
  assert.deepEqual(i.series[METRIC.restingHr], [{ date: TODAY, value: 52 }]);
  assert.equal(i.workouts.length, 0);
});

test("input builder prefers garmin for watch data and manual for back", () => {
  const rows = [
    { date: TODAY, metricType: METRIC.restingHr, value: 60, source: "manual" },
    { date: TODAY, metricType: METRIC.restingHr, value: 52, source: "garmin" },
    { date: TODAY, metricType: METRIC.backStatus, value: 2, source: "manual" },
    { date: TODAY, metricType: METRIC.backStatus, value: 0, source: "garmin" },
  ];
  const i = buildReadinessInput(TODAY, rows, []);
  assert.equal(i.series[METRIC.restingHr][0].value, 52);
  assert.equal(i.series[METRIC.backStatus][0].value, 2);
});

test("verdict codes are 0..3", () => {
  assert.deepEqual(["rest", "easy", "steady", "push"].map((v) => verdictCode(v as never)), [0, 1, 2, 3]);
});

test("headlines and notes never use em dashes", () => {
  for (const t of [{}, { sleep: 6 }, { hrv: 70, sleep: 8.3, rhr: 48, bb: 92 }, { back: 2 }, { back: 1, rhr: 60 }]) {
    const r = computeReadiness(input(t, 28, { workouts: steadyWorkouts() }));
    assert.ok(!r.headline.includes("—"));
    for (const s of r.signals) assert.ok(!s.note.includes("—") && s.note.endsWith("."), s.note);
  }
});
