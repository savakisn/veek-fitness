// Prompt builders + the shapes the model returns. The kitchen system prompt is the
// important bit: ease him up from fast food gradually, high protein, easy, no gut-shock.

export type PlannedMeal = {
  name: string;
  blurb: string;
  proteinGrams: number;
  prepMinutes: number;
  ingredients: { item: string; quantity: string }[];
  steps: string[];
};
export type WeeklyMealPlan = { days: { day: string; meal: PlannedMeal }[] };

export type RecipeSuggestion = {
  name: string;
  blurb: string;
  proteinGrams: number;
  prepMinutes: number;
  usesFromPantry: string[];
  alsoNeed: string[];
  steps: string[];
};
export type FridgeResult = { recipes: RecipeSuggestion[] };

const KITCHEN_SYSTEM = `You help someone who currently eats a lot of fast food start eating better without hating it.

Hard rules:
- EASY only: few common-grocery ingredients, minimal technique, 30 minutes or less.
- Bias HIGH PROTEIN.
- This person gets an upset stomach when their diet changes too fast. Do NOT pile on vegetables, fiber, beans, or unfamiliar "health" foods. Ease up GRADUALLY: a better version of food they already like, not a health overhaul.
- Keep it interesting and varied; don't repeat the same main protein on back-to-back days.
- Return ONLY valid JSON matching the requested shape. No prose, no markdown.`;

function dislikeLine(dislikes: string[]): string {
  return dislikes.length ? `Avoid entirely: ${dislikes.join(", ")}.` : "No hard dislikes.";
}

export function mealPlanPrompt(opts: {
  household: number;
  dietStyle: string;
  dislikes: string[];
  pantry: string[];
}): { system: string; prompt: string } {
  const prompt = [
    `Plan 7 easy, high-protein dinners for ${opts.household} people. Diet leaning: ${opts.dietStyle}.`,
    dislikeLine(opts.dislikes),
    opts.pantry.length ? `Lean on what's already on hand where it helps: ${opts.pantry.join(", ")}.` : "",
    "",
    "Return JSON exactly like:",
    `{"days":[{"day":"Monday","meal":{"name":"","blurb":"one friendly sentence","proteinGrams":40,"prepMinutes":25,"ingredients":[{"item":"chicken thighs","quantity":"1 lb"}],"steps":["short step","short step"]}}]}`,
    "Use Monday through Sunday. Keep steps to 3-5 short lines each.",
  ]
    .filter(Boolean)
    .join("\n");
  return { system: KITCHEN_SYSTEM, prompt };
}

export function fridgePrompt(opts: {
  household: number;
  dislikes: string[];
  pantry: string[];
}): { system: string; prompt: string } {
  const prompt = [
    `Here's what's on hand: ${opts.pantry.join(", ") || "not much"}.`,
    `Suggest up to 4 easy, high-protein meals for ${opts.household} that can mostly be made from these, noting the few extra items needed.`,
    dislikeLine(opts.dislikes),
    "",
    "Return JSON exactly like:",
    `{"recipes":[{"name":"","blurb":"one sentence","proteinGrams":40,"prepMinutes":20,"usesFromPantry":["eggs"],"alsoNeed":["tortillas"],"steps":["short step"]}]}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { system: KITCHEN_SYSTEM, prompt };
}

export function fitnessSummaryPrompt(stats: {
  weekSessions: number;
  weeklyGoal: number;
  streakWeeks: number;
  byCategory: Record<string, number>;
  recentTypes: string[];
}): { system: string; prompt: string } {
  const system =
    "You are a concise, encouraging fitness coach. The user's goal is staying mobile and protecting their back into old age, not bodybuilding. Write 2-3 short sentences, no emojis, no fluff. Name one thing they did well and one nudge for the week ahead.";
  const prompt = [
    `Sessions this week: ${stats.weekSessions} (goal ${stats.weeklyGoal}).`,
    `Current streak: ${stats.streakWeeks} weeks.`,
    `By category: ${JSON.stringify(stats.byCategory)}.`,
    `Recent activities: ${stats.recentTypes.join(", ") || "none yet"}.`,
  ].join("\n");
  return { system, prompt };
}
