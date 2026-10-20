import { test } from "node:test";
import assert from "node:assert/strict";
import type { AiClient } from "./core";
import { AiLimitError, dailyLimit, reserveCall, parseJsonLoose } from "./core";
import { parseQuickLogText, sanitizeQuickLog, shiftISO } from "./quick-log";
import { checkExplanation, explainWith } from "./readiness-core";
import { adaptWith, validateSwaps, type AdaptExercise, type AdaptItem } from "./adapt-core";
import type { Readiness } from "../readiness/types";

const fake = (reply: string | (() => string)): AiClient => ({
  async complete() {
    return typeof reply === "function" ? reply() : reply;
  },
});

// ---------- quick log ----------
const TODAY = "2026-10-20";

test("shiftISO subtracts days across month boundaries", () => {
  assert.equal(shiftISO("2026-10-01", 1), "2026-09-30");
  assert.equal(shiftISO(TODAY, 0), TODAY);
});

test("quick log: parses the happy path", async () => {
  const c = fake(
    JSON.stringify({
      type: "Disc golf",
      durationMinutes: 45,
      perceivedEffort: 3,
      daysAgo: 0,
      backStatus: 1,
      backNote: "a little tight after",
      notes: null,
    }),
  );
  const p = await parseQuickLogText(c, "45 min disc golf, back a little tight after, felt like a 3", TODAY);
  assert.deepEqual(p, {
    type: "Disc golf",
    durationMinutes: 45,
    perceivedEffort: 3,
    date: TODAY,
    back: { status: 1, note: "a little tight after" },
    notes: null,
  });
});

test("quick log: understands yesterday", () => {
  const p = sanitizeQuickLog({ type: "Walk", daysAgo: 1 }, TODAY);
  assert.equal(p?.date, "2026-10-19");
});

test("quick log: clamps and drops invalid values", () => {
  const p = sanitizeQuickLog(
    { type: "Run", durationMinutes: 99999, perceivedEffort: 9, daysAgo: -3, backStatus: 5, backNote: "x", notes: "a — b" },
    TODAY,
  );
  assert.equal(p?.durationMinutes, 600);
  assert.equal(p?.perceivedEffort, null);
  assert.equal(p?.date, TODAY); // future offset falls back to today
  assert.equal(p?.back, null);
  assert.equal(p?.notes, "a , b");
});

test("quick log: drops negative duration and non-integer day offsets", () => {
  const p = sanitizeQuickLog({ type: "Bike", durationMinutes: -5, daysAgo: 1.5, perceivedEffort: 2.6 }, TODAY);
  assert.equal(p?.durationMinutes, null);
  assert.equal(p?.date, TODAY);
  assert.equal(p?.perceivedEffort, 3);
});

test("quick log: no activity or garbage gives null", async () => {
  assert.equal(sanitizeQuickLog({ type: null }, TODAY), null);
  assert.equal(sanitizeQuickLog({ type: 7 }, TODAY), null);
  assert.equal(sanitizeQuickLog("nope", TODAY), null);
  assert.equal(await parseQuickLogText(fake("not json at all"), "hi", TODAY), null);
  assert.equal(await parseQuickLogText(fake("{}"), "   ", TODAY), null);
});

test("quick log: tolerates fenced JSON", async () => {
  const p = await parseQuickLogText(fake('```json\n{"type":"Ski","daysAgo":2}\n```'), "skied", TODAY);
  assert.equal(p?.type, "Ski");
  assert.equal(p?.date, "2026-10-18");
});

test("parseJsonLoose throws on junk", () => {
  assert.throws(() => parseJsonLoose("nothing here"));
});

// ---------- readiness reason ----------
const R: Readiness = {
  date: TODAY,
  verdict: "easy",
  score: 48,
  confidence: "medium",
  headline: "Easy day. Sleep was short.",
  signals: [
    { key: "sleep", label: "Sleep", value: 6.1, unit: "h", baseline: 7, z: -1.2, effect: "bad", note: "6.1 h, 0.9 h under your norm" },
    { key: "hrv", label: "HRV", value: 52, unit: "ms", baseline: 55, z: -0.3, effect: "neutral", note: "52 ms, near your 55 ms norm" },
  ],
  limits: { maxIntensity: "low", backSafeOnly: true, avoidCategories: [] },
};

test("number post-check accepts numbers from the input", () => {
  assert.equal(
    checkExplanation("Sleep was 6.1 h, 0.9 h under your norm, so keep it easy.", R),
    "Sleep was 6.1 h, 0.9 h under your norm, so keep it easy.",
  );
  assert.ok(checkExplanation("Score is 48 today. Take it easy.", R));
});

test("number post-check rejects invented numbers", () => {
  assert.equal(checkExplanation("You slept 5 hours, so go easy.", R), null);
  assert.equal(checkExplanation("HRV dropped 20%.", R), null);
});

test("explanation rejects long or multi-paragraph output and rewrites dashes", () => {
  assert.equal(checkExplanation("One. Two. Three.", R), null);
  assert.equal(checkExplanation("x".repeat(300), R), null);
  assert.equal(checkExplanation("Short sleep — go easy.", R), "Short sleep , go easy.");
});

test("explainWith falls back to the headline on a bad reply", async () => {
  assert.equal(await explainWith(fake("You slept 4 hours."), R), R.headline);
  assert.equal(await explainWith(fake(""), R), R.headline);
  assert.equal(await explainWith(fake("Sleep ran 0.9 h short, so keep today easy."), R), "Sleep ran 0.9 h short, so keep today easy.");
});

// ---------- adaptation envelope ----------
const ex = (id: number, name: string, category: string, backSafe = true): AdaptExercise => ({ id, name, category, backSafe });
const items: AdaptItem[] = [
  { ...ex(1, "Deadlift", "strength", false), position: 0 },
  { ...ex(2, "Cat cow", "mobility"), position: 1 },
];
const pool: AdaptExercise[] = [ex(3, "Glute bridge", "strength"), ex(4, "Good morning", "strength", false), ex(5, "Plank", "core")];
const limits = { backSafeOnly: true, avoidCategories: ["core"] };
const run = (reply: unknown) =>
  adaptWith(fake(JSON.stringify(reply)), { routine: { name: "Legs", items }, exercisesAvailable: pool, limits, soreSpot: "lower back" });

test("adapt: accepts an in-envelope swap", async () => {
  const r = await run({ swaps: [{ fromId: 1, toId: 3, reason: "Easier on the back." }] });
  assert.equal(r.adapted, true);
  assert.deepEqual(r.items.map((i) => i.id), [3, 2]);
});

test("adapt: rejects unknown ids, non-backSafe picks and avoided categories", async () => {
  for (const toId of [99, 4, 5]) {
    const r = await run({ swaps: [{ fromId: 1, toId, reason: "x" }] });
    assert.equal(r.adapted, false);
    assert.deepEqual(r.items, items);
  }
});

test("adapt: one bad swap rejects all; also rejects unknown fromId and duplicates", () => {
  const p = pool.filter((e) => e.id === 3);
  assert.equal(validateSwaps({ swaps: [{ fromId: 1, toId: 3, reason: "" }, { fromId: 2, toId: 99, reason: "" }] }, items, p), null);
  assert.equal(validateSwaps({ swaps: [{ fromId: 42, toId: 3, reason: "" }] }, items, p), null);
  assert.equal(validateSwaps({ swaps: [{ fromId: 1, toId: 2, reason: "" }] }, items, [...p, ex(2, "Cat cow", "mobility")]), null);
  assert.equal(validateSwaps({ nope: true }, items, p), null);
});

test("adapt: model failure or junk falls back to the original", async () => {
  const bad: AiClient = { async complete() { throw new Error("boom"); } };
  const r1 = await adaptWith(bad, { routine: { name: "Legs", items }, exercisesAvailable: pool, limits });
  assert.equal(r1.adapted, false);
  const r2 = await adaptWith(fake("garbage"), { routine: { name: "Legs", items }, exercisesAvailable: pool, limits });
  assert.equal(r2.adapted, false);
});

// ---------- spend cap ----------
test("spend cap refuses past the limit", async () => {
  const counts = new Map<string, number>();
  const counter = {
    async increment(u: number, d: string) {
      const k = `${u}|${d}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
      return counts.get(k)!;
    },
  };
  for (let i = 0; i < 3; i++) await reserveCall(counter, 1, TODAY, 3);
  await assert.rejects(() => reserveCall(counter, 1, TODAY, 3), AiLimitError);
  await reserveCall(counter, 2, TODAY, 3); // other user unaffected
  await reserveCall(counter, 1, "2026-10-21", 3); // next day resets
});

test("dailyLimit reads a positive integer or defaults to 60", () => {
  assert.equal(dailyLimit(undefined), 60);
  assert.equal(dailyLimit("abc"), 60);
  assert.equal(dailyLimit("-4"), 60);
  assert.equal(dailyLimit("25"), 25);
});
