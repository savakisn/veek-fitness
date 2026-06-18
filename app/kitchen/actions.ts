"use server";

import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { startOfWeek } from "date-fns";
import { getDb } from "@/lib/db";
import { pantryItems, mealPlans, groceryItems, mealFeedback, savedRecipes } from "@/lib/db/schema";
import {
  getPantry,
  getCurrentMealPlan,
  getMealFeedback,
  splitFeedback,
  getHousehold,
  getGrocery,
} from "@/lib/db/kitchen";
import { generateJSON } from "@/lib/ai";
import { AiUnavailableError } from "@/lib/ai";
import { mealPlanPrompt, fridgePrompt, replacementMealPrompt, recipeForPrompt } from "@/lib/ai/prompts";
import type { WeeklyMealPlan, FridgeResult, RecipeSuggestion, PlannedMeal } from "@/lib/ai/prompts";

function aiError(e: unknown): string {
  if (e instanceof AiUnavailableError) return "AI isn't set up yet. Add ANTHROPIC_API_KEY to enable it.";
  return "The AI had trouble with that. Try again.";
}

// Combine quantity strings for the same item into one ("1 lb" + "0.5 lb").
function mergeQty(qtys: string[]): string | null {
  const uniq = [...new Set(qtys.map((q) => q.trim()).filter(Boolean))];
  return uniq.length ? uniq.join(" + ") : null;
}

// --- Pantry ---
export async function addPantryItem(input: {
  name: string;
  category?: string | null;
  location?: string;
  quantity?: string | null;
  useBy?: string | null;
}) {
  const db = await getDb();
  await db.insert(pantryItems).values({
    name: input.name.trim(),
    category: input.category ?? null,
    location: input.location ?? "fridge",
    quantity: input.quantity ?? null,
    useBy: input.useBy || null,
  });
  revalidatePath("/kitchen");
}

export async function deletePantryItem(id: number) {
  const db = await getDb();
  await db.delete(pantryItems).where(eq(pantryItems.id, id));
  revalidatePath("/kitchen");
}

// --- Meal plan (AI) ---
export async function rateMeal(name: string, sentiment: "like" | "dislike" | null) {
  const db = await getDb();
  const n = name.trim();
  if (!n) return;
  if (sentiment === null) {
    await db.delete(mealFeedback).where(eq(mealFeedback.name, n));
  } else {
    await db
      .insert(mealFeedback)
      .values({ name: n, sentiment })
      .onConflictDoUpdate({ target: mealFeedback.name, set: { sentiment } });
  }
  revalidatePath("/kitchen");
}

// "Not this week" — drop a meal from the current plan (it can resurface later;
// for a permanent no, thumbs-down steers the AI to avoid it).
export async function dismissMeal(name: string) {
  const db = await getDb();
  const plan = await getCurrentMealPlan();
  if (!plan) return;
  const meals = (plan.meals ?? []).filter(
    (m) => m.name.trim().toLowerCase() !== name.trim().toLowerCase(),
  );
  const [row] = await db
    .select({ id: mealPlans.id })
    .from(mealPlans)
    .orderBy(desc(mealPlans.weekStart), desc(mealPlans.createdAt))
    .limit(1);
  if (row) await db.update(mealPlans).set({ plan: { meals } }).where(eq(mealPlans.id, row.id));
  revalidatePath("/kitchen");
}

// Remove a meal and refill the slot with a fresh idea, so the week stays a full
// shopping list. Used by "not this week" and disliking a planned meal.
export async function replaceMealInPlan(name: string): Promise<{ ok: boolean }> {
  const db = await getDb();
  const plan = await getCurrentMealPlan();
  if (!plan) return { ok: false };
  const remaining = (plan.meals ?? []).filter(
    (m) => m.name.trim().toLowerCase() !== name.trim().toLowerCase(),
  );
  try {
    const [h, pantry, feedback] = await Promise.all([getHousehold(), getPantry(), getMealFeedback()]);
    const taste = splitFeedback(feedback);
    const { system, prompt } = replacementMealPrompt({
      household: h.householdSize,
      dietStyle: h.dietStyle,
      dislikes: h.dislikes,
      pantry: pantry.map((i) => i.name),
      liked: taste.liked,
      disliked: [...taste.disliked, name, ...remaining.map((m) => m.name)],
    });
    const res = await generateJSON<{ meal: PlannedMeal }>(prompt, system);
    if (res?.meal?.name) remaining.push(res.meal);
  } catch {
    /* leave it removed if a replacement can't be generated */
  }
  const [row] = await db
    .select({ id: mealPlans.id })
    .from(mealPlans)
    .orderBy(desc(mealPlans.weekStart), desc(mealPlans.createdAt))
    .limit(1);
  if (row) await db.update(mealPlans).set({ plan: { meals: remaining } }).where(eq(mealPlans.id, row.id));
  revalidatePath("/kitchen");
  return { ok: true };
}

export async function generateMealPlan(note?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const [h, pantry, feedback] = await Promise.all([getHousehold(), getPantry(), getMealFeedback()]);
    const taste = splitFeedback(feedback);
    const { system, prompt } = mealPlanPrompt({
      household: h.householdSize,
      dietStyle: h.dietStyle,
      dislikes: h.dislikes,
      pantry: pantry.map((i) => i.name),
      liked: taste.liked,
      disliked: taste.disliked,
      note: note?.trim() || undefined,
    });
    const plan = await generateJSON<WeeklyMealPlan>(prompt, system);
    const db = await getDb();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().slice(0, 10);
    await db.insert(mealPlans).values({ weekStart, plan });
    revalidatePath("/kitchen");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}

// Add a specific dish the user typed; AI fills in the real recipe so it can
// flow into the grocery list. Appends to the current plan (or starts one).
export async function addMealToPlan(name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const n = name.trim();
  if (!n) return { ok: false, error: "Type a meal first." };
  try {
    const [h, plan] = await Promise.all([getHousehold(), getCurrentMealPlan()]);
    const { system, prompt } = recipeForPrompt({ name: n, household: h.householdSize, dislikes: h.dislikes });
    const res = await generateJSON<{ meal: PlannedMeal }>(prompt, system);
    if (!res?.meal?.name) return { ok: false, error: "Couldn't build that recipe. Try again." };
    const meals = [...(plan?.meals ?? []), res.meal];
    const db = await getDb();
    const [row] = await db
      .select({ id: mealPlans.id })
      .from(mealPlans)
      .orderBy(desc(mealPlans.weekStart), desc(mealPlans.createdAt))
      .limit(1);
    if (row) {
      await db.update(mealPlans).set({ plan: { meals } }).where(eq(mealPlans.id, row.id));
    } else {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().slice(0, 10);
      await db.insert(mealPlans).values({ weekStart, plan: { meals } });
    }
    revalidatePath("/kitchen");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}

// --- Fridge to recipe (AI, not persisted) ---
export async function fridgeToRecipe(): Promise<
  { ok: true; recipes: RecipeSuggestion[] } | { ok: false; error: string }
> {
  try {
    const [h, pantry, feedback] = await Promise.all([getHousehold(), getPantry(), getMealFeedback()]);
    if (pantry.length === 0) return { ok: false, error: "Add a few pantry items first so it has something to work with." };
    const taste = splitFeedback(feedback);
    const { system, prompt } = fridgePrompt({
      household: h.householdSize,
      dislikes: h.dislikes,
      pantry: pantry.map((i) => i.name),
      liked: taste.liked,
      disliked: taste.disliked,
    });
    const result = await generateJSON<FridgeResult>(prompt, system);
    return { ok: true, recipes: result.recipes ?? [] };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}

// --- Grocery ---
export async function buildGroceryFromPlan(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const plan = await getCurrentMealPlan();
  if (!plan) return { ok: false, error: "Generate a meal plan first." };
  const pantryNames = (await getPantry()).map((i) => i.name.toLowerCase());
  const have = (key: string) => pantryNames.some((pn) => pn.includes(key) || key.includes(pn));

  // Merge the same ingredient across meals into one line with combined quantity.
  const agg = new Map<string, { name: string; qtys: string[] }>();
  for (const m of plan.meals ?? []) {
    for (const ing of m.ingredients ?? []) {
      const name = ing.item?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (have(key)) continue;
      const entry = agg.get(key) ?? { name, qtys: [] };
      if (ing.quantity) entry.qtys.push(ing.quantity);
      agg.set(key, entry);
    }
  }

  const db = await getDb();
  await db.delete(groceryItems);
  const vals = [...agg.values()].map((e) => ({ name: e.name, quantity: mergeQty(e.qtys) }));
  if (vals.length) await db.insert(groceryItems).values(vals);
  revalidatePath("/kitchen");
  return { ok: true, count: vals.length };
}

// --- Menu (saved recipes) ---
export async function saveRecipe(input: {
  name: string;
  blurb?: string | null;
  proteinGrams?: number | null;
  prepMinutes?: number | null;
  items: { item: string; quantity?: string }[];
  steps?: string[] | null;
}) {
  const db = await getDb();
  const name = input.name.trim();
  if (!name) return;
  // Note: favorite is intentionally not in the update set, so re-saving a
  // bookmarked recipe doesn't clear its favorite tag.
  const row = {
    blurb: input.blurb ?? null,
    proteinGrams: input.proteinGrams ?? null,
    prepMinutes: input.prepMinutes ?? null,
    items: input.items ?? [],
    steps: input.steps ?? null,
  };
  await db
    .insert(savedRecipes)
    .values({ name, ...row })
    .onConflictDoUpdate({ target: savedRecipes.name, set: row });
  revalidatePath("/kitchen");
}

export async function toggleFavorite(id: number, favorite: boolean) {
  const db = await getDb();
  await db.update(savedRecipes).set({ favorite }).where(eq(savedRecipes.id, id));
  revalidatePath("/kitchen");
}

export async function deleteSavedRecipe(id: number) {
  const db = await getDb();
  const [r] = await db.select({ name: savedRecipes.name }).from(savedRecipes).where(eq(savedRecipes.id, id));
  await db.delete(savedRecipes).where(eq(savedRecipes.id, id));
  // Also clear any "favorite" like so it's gone entirely, not lingering up top.
  if (r?.name) await db.delete(mealFeedback).where(eq(mealFeedback.name, r.name));
  revalidatePath("/kitchen");
}

// Turn a name-only "liked" favorite into a full, favorited Menu recipe (AI fills
// the recipe + steps). Used to migrate the old like-based favorites.
export async function importFavorite(name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const n = name.trim();
  if (!n) return { ok: false, error: "No meal." };
  try {
    const h = await getHousehold();
    const { system, prompt } = recipeForPrompt({ name: n, household: h.householdSize, dislikes: h.dislikes });
    const res = await generateJSON<{ meal: PlannedMeal }>(prompt, system);
    const m = res?.meal;
    if (!m?.name) return { ok: false, error: "Couldn't build that recipe. Try again." };
    const db = await getDb();
    const row = {
      blurb: m.blurb ?? null,
      proteinGrams: m.proteinGrams ?? null,
      prepMinutes: m.prepMinutes ?? null,
      items: m.ingredients ?? [],
      steps: m.steps ?? null,
      favorite: true,
    };
    await db.insert(savedRecipes).values({ name: n, ...row }).onConflictDoUpdate({ target: savedRecipes.name, set: row });
    // Keep the "like" so the planner still favors it; it just no longer shows as a pending import.
    revalidatePath("/kitchen");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}

export async function addSavedToGrocery(
  id: number,
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const db = await getDb();
  const [recipe] = await db.select().from(savedRecipes).where(eq(savedRecipes.id, id));
  if (!recipe) return { ok: false, error: "Recipe not found." };

  const byName = new Map((await getGrocery()).map((g) => [g.name.toLowerCase(), g]));
  let added = 0;
  for (const it of recipe.items ?? []) {
    const name = it.item?.trim();
    if (!name) continue;
    const match = byName.get(name.toLowerCase());
    if (match) {
      const merged = mergeQty([match.quantity ?? "", it.quantity ?? ""]);
      await db.update(groceryItems).set({ quantity: merged }).where(eq(groceryItems.id, match.id));
    } else {
      await db.insert(groceryItems).values({ name, quantity: it.quantity ?? null });
      added++;
    }
  }
  revalidatePath("/kitchen");
  return { ok: true, added };
}

export async function toggleGrocery(id: number, checked: boolean) {
  const db = await getDb();
  await db.update(groceryItems).set({ checked }).where(eq(groceryItems.id, id));
  revalidatePath("/kitchen");
}

export async function addGroceryItem(name: string) {
  const db = await getDb();
  await db.insert(groceryItems).values({ name: name.trim() });
  revalidatePath("/kitchen");
}

export async function clearGrocery() {
  const db = await getDb();
  await db.delete(groceryItems);
  revalidatePath("/kitchen");
}
