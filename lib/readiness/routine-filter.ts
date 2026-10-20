// Which routines fit inside today's readiness limits. Pure so it can be tested
// without a database.
import type { Readiness } from "./types";

export type RoutineProfile = {
  goalTag: string;
  difficulty: string;
  allBackSafe: boolean;
  categories: string[]; // exercise categories in the routine
};

const REST_TAGS = ["recovery", "mobility", "yoga"];
const EASY_TAGS = [...REST_TAGS, "core", "pilates"];

// The hard part: back safety and avoided categories. Never relaxed.
export function withinHardLimits(p: RoutineProfile, limits: Readiness["limits"]): boolean {
  if (limits.backSafeOnly && !p.allBackSafe) return false;
  for (const c of limits.avoidCategories) if (p.goalTag === c || p.categories.includes(c)) return false;
  return true;
}

// The full fit: hard limits plus the kind of session the intensity cap allows.
export function fitsLimits(p: RoutineProfile, limits: Readiness["limits"]): boolean {
  if (!withinHardLimits(p, limits)) return false;
  if (limits.maxIntensity === "none") return REST_TAGS.includes(p.goalTag) && p.difficulty === "easy";
  if (limits.maxIntensity === "low") return EASY_TAGS.includes(p.goalTag) && p.difficulty === "easy";
  return true;
}
