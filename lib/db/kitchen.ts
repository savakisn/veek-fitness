import "server-only";
import { desc, asc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { pantryItems, mealPlans, groceryItems, mealFeedback, household } from "./schema";
import type { PantryItem, GroceryItem, MealFeedback, Household } from "./schema";
import type { WeeklyMealPlan } from "../ai/prompts";

export async function getHousehold(): Promise<Household> {
  const db = await getDb();
  const [h] = await db.select().from(household).where(eq(household.id, 1));
  if (h) return h;
  const [created] = await db.insert(household).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? { id: 1, householdSize: 2, dietStyle: "healthier, easy, high-protein", dislikes: [] };
}

export async function getMealFeedback(): Promise<MealFeedback[]> {
  const db = await getDb();
  return db.select().from(mealFeedback);
}

// Split feedback into liked / disliked meal names for prompting.
export function splitFeedback(rows: MealFeedback[]): { liked: string[]; disliked: string[] } {
  return {
    liked: rows.filter((r) => r.sentiment === "like").map((r) => r.name),
    disliked: rows.filter((r) => r.sentiment === "dislike").map((r) => r.name),
  };
}

export async function getPantry(): Promise<PantryItem[]> {
  const db = await getDb();
  // use_by ASC puts soonest-expiring first; Postgres sorts NULLs last on ASC.
  return db.select().from(pantryItems).orderBy(asc(pantryItems.useBy), desc(pantryItems.createdAt));
}

export async function getCurrentMealPlan(): Promise<WeeklyMealPlan | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(mealPlans)
    .orderBy(desc(mealPlans.weekStart), desc(mealPlans.createdAt))
    .limit(1);
  return row ? (row.plan as WeeklyMealPlan) : null;
}

export async function getGrocery(): Promise<GroceryItem[]> {
  const db = await getDb();
  return db.select().from(groceryItems).orderBy(asc(groceryItems.checked), desc(groceryItems.createdAt));
}
