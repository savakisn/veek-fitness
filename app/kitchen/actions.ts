"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
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
import { mealPlanPrompt, fridgePrompt } from "@/lib/ai/prompts";
import type { WeeklyMealPlan, FridgeResult, RecipeSuggestion } from "@/lib/ai/prompts";

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

export async function generateMealPlan(): Promise<{ ok: true } | { ok: false; error: string }> {
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
}) {
  const db = await getDb();
  const name = input.name.trim();
  if (!name) return;
  const row = {
    blurb: input.blurb ?? null,
    proteinGrams: input.proteinGrams ?? null,
    prepMinutes: input.prepMinutes ?? null,
    items: input.items ?? [],
  };
  await db
    .insert(savedRecipes)
    .values({ name, ...row })
    .onConflictDoUpdate({ target: savedRecipes.name, set: row });
  revalidatePath("/kitchen");
}

export async function deleteSavedRecipe(id: number) {
  const db = await getDb();
  await db.delete(savedRecipes).where(eq(savedRecipes.id, id));
  revalidatePath("/kitchen");
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
