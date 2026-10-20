import { test } from "node:test";
import assert from "node:assert/strict";
import { fitsLimits, withinHardLimits, type RoutineProfile } from "./routine-filter";
import type { Readiness } from "./types";

const r = (goalTag: string, o: Partial<RoutineProfile> = {}): RoutineProfile => ({
  goalTag,
  difficulty: "easy",
  allBackSafe: true,
  categories: ["mobility"],
  ...o,
});
const lim = (o: Partial<Readiness["limits"]> = {}): Readiness["limits"] => ({
  maxIntensity: "moderate",
  backSafeOnly: false,
  avoidCategories: [],
  ...o,
});

test("rest allows only recovery, mobility and yoga", () => {
  const l = lim({ maxIntensity: "none" });
  assert.equal(fitsLimits(r("recovery"), l), true);
  assert.equal(fitsLimits(r("yoga"), l), true);
  assert.equal(fitsLimits(r("core"), l), false);
  assert.equal(fitsLimits(r("strength"), l), false);
});

test("easy also allows core and pilates, easy difficulty only", () => {
  const l = lim({ maxIntensity: "low" });
  assert.equal(fitsLimits(r("core"), l), true);
  assert.equal(fitsLimits(r("pilates"), l), true);
  assert.equal(fitsLimits(r("core", { difficulty: "moderate" }), l), false);
  assert.equal(fitsLimits(r("full_body"), l), false);
});

test("steady and push allow anything", () => {
  assert.equal(fitsLimits(r("strength", { difficulty: "moderate" }), lim()), true);
  assert.equal(fitsLimits(r("sport_prep"), lim({ maxIntensity: "high" })), true);
});

test("back-safe only drops routines with any unsafe exercise", () => {
  const l = lim({ backSafeOnly: true });
  assert.equal(withinHardLimits(r("mobility", { allBackSafe: false }), l), false);
  assert.equal(withinHardLimits(r("mobility"), l), true);
});

test("avoided categories match exercise categories and the goal tag", () => {
  const l = lim({ avoidCategories: ["strength"] });
  assert.equal(withinHardLimits(r("full_body", { categories: ["core", "strength"] }), l), false);
  assert.equal(withinHardLimits(r("strength", { categories: [] }), l), false);
  assert.equal(withinHardLimits(r("core", { categories: ["core"] }), l), true);
});
