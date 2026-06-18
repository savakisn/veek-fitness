// Prompt builders + the shapes the model returns. The kitchen system prompt is the
// important bit: ease him up from fast food gradually, high protein, easy, no gut-shock.

export type PlannedMeal = {
  name: string;
  kind?: "staple" | "new";
  blurb: string;
  proteinGrams: number;
  prepMinutes: number;
  ingredients: { item: string; quantity: string }[];
  steps: string[];
};
export type WeeklyMealPlan = { meals: PlannedMeal[] };

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
- Write any blurbs plainly. No em dashes (use commas or periods), no hype or flattery.
- Return ONLY valid JSON matching the requested shape. No prose, no markdown.`;

function dislikeLine(dislikes: string[]): string {
  return dislikes.length ? `Avoid entirely: ${dislikes.join(", ")}.` : "No hard dislikes.";
}

function tasteLines(liked: string[], disliked: string[]): string[] {
  const out: string[] = [];
  if (liked.length) out.push(`Meals he's liked before (favor these and similar styles): ${liked.join(", ")}.`);
  if (disliked.length) out.push(`Meals he disliked (do NOT suggest these or close variations): ${disliked.join(", ")}.`);
  return out;
}

export function mealPlanPrompt(opts: {
  household: number;
  dietStyle: string;
  dislikes: string[];
  pantry: string[];
  liked: string[];
  disliked: string[];
  note?: string;
}): { system: string; prompt: string } {
  const prompt = [
    `Suggest a short week of easy, high-protein dinner ideas for ${opts.household} people. Diet leaning: ${opts.dietStyle}.`,
    "Default to about 3 ideas, a couple of easy STAPLES they can repeat plus an interesting NEW one. NOT one different meal per day.",
    opts.note ? `This week's situation (honor it, including any number of meals or extra-easy request): ${opts.note}.` : "",
    dislikeLine(opts.dislikes),
    ...tasteLines(opts.liked, opts.disliked),
    opts.pantry.length ? `Lean on what's already on hand where it helps: ${opts.pantry.join(", ")}.` : "",
    "",
    "Return JSON exactly like:",
    `{"meals":[{"name":"","kind":"staple","blurb":"one friendly sentence","proteinGrams":40,"prepMinutes":25,"ingredients":[{"item":"chicken thighs","quantity":"1 lb"}],"steps":["short step","short step"]}]}`,
    `kind is "new" or "staple". Keep steps to 3-5 short lines each.`,
  ]
    .filter(Boolean)
    .join("\n");
  return { system: KITCHEN_SYSTEM, prompt };
}

// One full recipe for a dish the user typed in ("add something else").
export function recipeForPrompt(opts: {
  name: string;
  household: number;
  dislikes: string[];
}): { system: string; prompt: string } {
  const prompt = [
    `Write one high-protein recipe for "${opts.name}" for ${opts.household} people.`,
    "They asked for this dish specifically, so give the real, accurate recipe even if it takes longer than 30 minutes. Set prepMinutes to the honest time.",
    dislikeLine(opts.dislikes),
    "Return JSON exactly like:",
    `{"meal":{"name":"${opts.name}","kind":"new","blurb":"one friendly sentence","proteinGrams":40,"prepMinutes":25,"ingredients":[{"item":"","quantity":""}],"steps":["short step"]}}`,
    "Keep steps to 3-6 short lines. Use real, specific quantities so it can build a grocery list.",
  ].join("\n");
  return { system: KITCHEN_SYSTEM, prompt };
}

export function fridgePrompt(opts: {
  household: number;
  dislikes: string[];
  pantry: string[];
  liked: string[];
  disliked: string[];
}): { system: string; prompt: string } {
  const prompt = [
    `Here's what's on hand: ${opts.pantry.join(", ") || "not much"}.`,
    `Suggest up to 4 easy, high-protein meals for ${opts.household} that can mostly be made from these, noting the few extra items needed.`,
    dislikeLine(opts.dislikes),
    ...tasteLines(opts.liked, opts.disliked),
    "",
    "Return JSON exactly like:",
    `{"recipes":[{"name":"","blurb":"one sentence","proteinGrams":40,"prepMinutes":20,"usesFromPantry":["eggs"],"alsoNeed":["tortillas"],"steps":["short step"]}]}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { system: KITCHEN_SYSTEM, prompt };
}

export function replacementMealPrompt(opts: {
  household: number;
  dietStyle: string;
  dislikes: string[];
  pantry: string[];
  liked: string[];
  disliked: string[];
}): { system: string; prompt: string } {
  const prompt = [
    `Suggest ONE easy, high-protein dinner idea for ${opts.household} people. Diet leaning: ${opts.dietStyle}.`,
    "It must be clearly different from anything in the disliked/avoid list below.",
    dislikeLine(opts.dislikes),
    ...tasteLines(opts.liked, opts.disliked),
    opts.pantry.length ? `Use what's on hand where it helps: ${opts.pantry.join(", ")}.` : "",
    "",
    "Return JSON exactly like:",
    `{"meal":{"name":"","kind":"new","blurb":"one sentence","proteinGrams":40,"prepMinutes":25,"ingredients":[{"item":"chicken thighs","quantity":"1 lb"}],"steps":["short step"]}}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { system: KITCHEN_SYSTEM, prompt };
}

export type CoachPick = { routineSlug: string; reason: string };

export function workoutCoachPrompt(opts: {
  available: { slug: string; name: string; goalTag: string }[];
  recent: string[];
  feeling: string;
  location: "home" | "gym";
}): { system: string; prompt: string } {
  const system =
    "You are a fitness coach whose priority is staying mobile and back-safe, not pushing hard. Pick exactly ONE routine from the provided list that fits how the person feels and where they are. When they feel low, tired, sore, or tight, favor gentler mobility/yoga/recovery; when they feel good, something more active is fine. Avoid repeating what they just did. The reason must be plain and specific, no em dashes (use commas or periods), no hype or flattery. Return ONLY valid JSON, no prose.";
  const prompt = [
    `Location: ${opts.location}.`,
    `How they feel today: ${opts.feeling || "not specified"}.`,
    `Recently did: ${opts.recent.join(", ") || "nothing lately"}.`,
    "Choose one slug from these available routines:",
    ...opts.available.map((r) => `- ${r.slug} (${r.name}, ${r.goalTag})`),
    "",
    `Return JSON exactly like: {"routineSlug":"morning-mobility","reason":"one short friendly sentence on why it fits today"}`,
  ].join("\n");
  return { system, prompt };
}

export type WeeklyRecap = { tldr: string; details: string[] };

export function fitnessSummaryPrompt(stats: {
  weekSessions: number;
  weeklyGoal: number;
  streakWeeks: number;
  byCategory: Record<string, number>;
  recentTypes: string[];
  avgSteps: number;
}): { system: string; prompt: string } {
  const system =
    "You are a fitness coach for someone whose goal is staying mobile and protecting their back into old age, not bodybuilding. A lot of their activity is daily walking, not gym sessions, so count steps as real movement. Plain and warm, like a sharp friend, not a hype machine. No em dashes (use commas or periods). No flattery or hype words like 'crushing it', 'amazing', 'killing it', or 'you've got this'. No emojis. Return ONLY valid JSON, no markdown.";
  const prompt = [
    `Sessions this week: ${stats.weekSessions} (goal ${stats.weeklyGoal}).`,
    `Average daily steps (last 7 days): ${stats.avgSteps || "no data"}.`,
    `Current streak: ${stats.streakWeeks} weeks.`,
    `By category: ${JSON.stringify(stats.byCategory)}.`,
    `Recent activities: ${stats.recentTypes.join(", ") || "none yet"}.`,
    "",
    'Return JSON like {"tldr":"one punchy sentence summarizing the week","details":["one specific thing going well","one concrete nudge for this week"]}.',
    "tldr is the bold one-line takeaway. details are 2-3 short lines, no headers.",
  ].join("\n");
  return { system, prompt };
}
