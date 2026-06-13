import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
  goalTag: text("goal_tag").notNull(), // mobility | core | full_body | recovery | sport_prep | strength
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

// Unified activity log. Garmin rows land here too, deduped by (source, external_id).
export const workouts = pgTable(
  "workouts",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    source: text("source").notNull().default("manual"), // manual | routine | garmin
    routineId: integer("routine_id").references(() => routines.id),
    location: text("location"), // home | gym | outdoor
    type: text("type"),
    durationMinutes: integer("duration_minutes"),
    perceivedEffort: integer("perceived_effort"), // 1-5
    notes: text("notes"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("workouts_source_external_uniq").on(t.source, t.externalId)],
);

// Generic time-series store. Every number, any source, charted over any range later.
export const metrics = pgTable(
  "metrics",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    metricType: text("metric_type").notNull(), // steps | resting_hr | sleep_hours | weight | ...
    value: real("value").notNull(),
    unit: text("unit"),
    source: text("source").notNull().default("manual"),
  },
  (t) => [
    uniqueIndex("metrics_date_type_source_uniq").on(t.date, t.metricType, t.source),
  ],
);

// Single-row settings. Two equipment profiles so Home grows and Gym already has everything.
export const profile = pgTable("profile", {
  id: integer("id").primaryKey().default(1),
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
});

export type Exercise = typeof exercises.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type RoutineExercise = typeof routineExercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Metric = typeof metrics.$inferSelect;
export type Profile = typeof profile.$inferSelect;
