import "server-only";
import { aiClientForUser } from "./index";
import { adaptWith, type AdaptExercise, type AdaptItem, type AdaptLimits, type AdaptResult } from "./adapt-core";

export type { AdaptExercise, AdaptItem, AdaptLimits, AdaptResult } from "./adapt-core";

// Swap exercises in a routine for back-safe, equipment-available alternatives.
// Throws AiUnavailableError / AiLimitError; any bad model output falls back to the
// original routine (adapted: false).
export async function adaptRoutine(args: {
  routine: { name: string; items: AdaptItem[] };
  exercisesAvailable: AdaptExercise[];
  limits: AdaptLimits;
  soreSpot?: string | null;
}): Promise<AdaptResult> {
  return adaptWith(await aiClientForUser(), args);
}
