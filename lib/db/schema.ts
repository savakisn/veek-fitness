import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  real,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Cached Garmin OAuth tokens so live fetches skip the slow full login. Single row.
export const garminAuth = pgTable("garmin_auth", {
  id: integer("id").primaryKey().default(1),
  oauth1: jsonb("oauth1"),
  oauth2: jsonb("oauth2"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Each person: their own login, goals, and equipment. Fitness is per-user.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  passcode: text("passcode").notNull().unique(),
  weeklyGoalSessions: integer("weekly_goal_sessions").notNull().default(3),
  homeEquipment: text("home_equipment").array().notNull().default(["mat"]),
  gymEquipment: text("gym_equipment")
    .array()
    .notNull()
    .default([
      "mat",
      "dumbbells",
      "barbell",
      "bench",
      "squat_rack",
      "pullup_bar",
      "bands",
      "kettlebell",
      "cable",
      "machine",
    ]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Shared household: one fridge, one grocery list, one diet. Single row.
export const household = pgTable("household", {
  id: integer("id").primaryKey().default(1),
  householdSize: integer("household_size").notNull().default(2),
  dietStyle: text("diet_style").notNull().default("healthier, easy, high-protein"),
  dislikes: text("dislikes").array().notNull().default([]),
});

// What an exercise needs and where it hits. equipment drives the Home/Gym filter.
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(), // mobility | core | strength | cardio | stretch
  primaryMuscles: text("primary_muscles").array().notNull().default([]),
  equipment: text("equipment").array().notNull().default(["none"]),
  backSafe: boolean("back_safe").notNull().default(true),
  cues: text("cues"),
});

export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  goalTag: text("goal_tag").notNull(), // mobility | core | full_body | recovery | sport_prep | strength | yoga | pilates
  estMinutes: integer("est_minutes").notNull().default(15),
  difficulty: text("difficulty").notNull().default("easy"),
});

export const routineExercises = pgTable("routine_exercises", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id),
  position: integer("position").notNull().default(0),
  sets: integer("sets"),
  reps: integer("reps"),
  durationSeconds: integer("duration_seconds"),
  restSeconds: integer("rest_seconds"),
  notes: text("notes"),
});

// Unified activity log, per user. Garmin rows land here too, deduped per user.
export const workouts = pgTable(
  "workouts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    date: date("date").notNull(),
    source: text("source").notNull().default("manual"), // manual | routine | garmin
    routineId: integer("routine_id").references(() => routines.id),
    location: text("location"), // home | gym | outdoor
    type: text("type"),
    durationMinutes: integer("duration_minutes"),
    perceivedEffort: integer("perceived_effort"), // 1-5
    notes: text("notes"),
    externalId: text("external_id"),
    // Per-session stats from a device (Garmin): avg/max HR, calories, distance, elevation.
    detail: jsonb("detail").$type<{
      avgHr?: number;
      maxHr?: number;
      calories?: number;
      distanceKm?: number;
      elevationM?: number;
      hrSamples?: { t: number; hr: number }[];
      speedSamples?: { t: number; v: number }[];
      distSamples?: { t: number; d: number }[];
      trim?: { startSec: number; endSec: number };
    }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("workouts_user_source_external_uniq").on(t.userId, t.source, t.externalId)],
);

// Generic time-series store, per user. Every number, any source, charted later.
export const metrics = pgTable(
  "metrics",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    date: date("date").notNull(),
    metricType: text("metric_type").notNull(), // steps | resting_hr | sleep_hours | weight | ...
    value: real("value").notNull(),
    unit: text("unit"),
    source: text("source").notNull().default("manual"),
  },
  (t) => [
    uniqueIndex("metrics_user_date_type_source_uniq").on(t.userId, t.date, t.metricType, t.source),
  ],
);

// Kitchen (shared household): what's on hand, feeds the Cook tab.
export const pantryItems = pgTable("pantry_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  location: text("location").notNull().default("fridge"), // fridge | freezer | pantry
  quantity: text("quantity"),
  useBy: date("use_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// A generated set of meal ideas for the week, stored as JSON.
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull(),
  plan: jsonb("plan").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  checked: boolean("checked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Remembered taste (shared): thumbs up/down on meals steer future plans.
export const mealFeedback = pgTable(
  "meal_feedback",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    sentiment: text("sentiment").notNull(), // like | dislike
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("meal_feedback_name_uniq").on(t.name)],
);

// Recipes saved to the household "Menu" — re-add to grocery, prune when bored of it.
export const savedRecipes = pgTable(
  "saved_recipes",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    blurb: text("blurb"),
    proteinGrams: integer("protein_grams"),
    prepMinutes: integer("prep_minutes"),
    items: jsonb("items").$type<{ item: string; quantity?: string }[]>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("saved_recipes_name_uniq").on(t.name)],
);

// Cached AI text per user (e.g. the weekly fitness summary).
export const aiInsights = pgTable(
  "ai_insights",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    date: date("date").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ai_insights_user_kind_date_uniq").on(t.userId, t.kind, t.date)],
);

export type User = typeof users.$inferSelect;
export type Household = typeof household.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type RoutineExercise = typeof routineExercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Metric = typeof metrics.$inferSelect;
export type PantryItem = typeof pantryItems.$inferSelect;
export type MealPlanRow = typeof mealPlans.$inferSelect;
export type GroceryItem = typeof groceryItems.$inferSelect;
export type AiInsight = typeof aiInsights.$inferSelect;
export type MealFeedback = typeof mealFeedback.$inferSelect;
export type SavedRecipe = typeof savedRecipes.$inferSelect;
export type GarminAuth = typeof garminAuth.$inferSelect;
