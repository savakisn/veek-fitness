import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTraining, type LoadInput } from "./load";
import { addDaysISO } from "./format";

// Midday in the app zone, so the calendar day is unambiguous.
const NOW = new Date("2026-10-20T16:00:00Z");
const TODAY = "2026-10-20";

function sessions(fromDaysAgo: number, toDaysAgo: number, every: number, minutes: number, effort: number): LoadInput[] {
  const out: LoadInput[] = [];
  for (let i = fromDaysAgo; i >= toDaysAgo; i -= every) {
    out.push({ date: addDaysISO(TODAY, -i), durationMinutes: minutes, perceivedEffort: effort, detail: null });
  }
  return out;
}

test("no activity: getting started", () => {
  const s = computeTraining([], [], NOW);
  assert.equal(s.label, "Getting started");
  assert.equal(s.ratio, 0);
});

test("steady routine reads on track", () => {
  const s = computeTraining(sessions(41, 0, 2, 45, 3), [], NOW);
  assert.equal(s.label, "On track");
  assert.ok(s.ratio > 0.85 && s.ratio < 1.2, `ratio ${s.ratio}`);
});

test("a hard week after a steady month reads as overreaching", () => {
  const s = computeTraining([...sessions(41, 7, 2, 45, 3), ...sessions(6, 0, 1, 90, 5)], [], NOW);
  assert.equal(s.label, "Overreaching");
});

test("first week ever: building a base, not overreaching", () => {
  const s = computeTraining(sessions(5, 0, 1, 40, 3), [], NOW);
  assert.equal(s.label, "Building a base");
});

test("data older than the window is ignored", () => {
  const a = computeTraining(sessions(41, 0, 2, 45, 3), [], NOW);
  const b = computeTraining([...sessions(41, 0, 2, 45, 3), ...sessions(80, 50, 1, 120, 5)], [], NOW);
  assert.deepEqual(a, b);
});
