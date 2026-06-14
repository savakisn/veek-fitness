import "server-only";
import { eq, desc, gte, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { exercises, routines, routineExercises, workouts, profile } from "./schema";
import type { Exercise, Routine, RoutineExercise, Workout, Profile } from "./schema";
import { isOwned } from "../equipment";
import { computeStreak, type StreakInfo } from "../streaks";

export type Location = "home" | "gym";

export async function getProfile(): Promise<Profile> {
  const db = await getDb();
  const [p] = await db.select().from(profile).where(eq(profile.id, 1));
  if (p) return p;
  // Defensive: if prod hasn't been seeded yet, hand back sane defaults.
  const [created] = await db.insert(profile).values({ id: 1 }).onConflictDoNothing().returning();
  return (
    created ?? {
      id: 1,
      weeklyGoalSessions: 3,
      homeEquipment: ["mat"],
      gymEquipment: ["mat", "dumbbells", "barbell", "bench", "squat_rack", "pullup_bar", "bands", "kettlebell", "cable", "machine"],
      householdSize: 2,
      dietStyle: "healthier, easy, high-protein",
      dislikes: [],
    }
  );
}

function ownedFor(p: Profile, location: Location): string[] {
  return location === "gym" ? p.gymEquipment : p.homeEquipment;
}

export type RoutineCard = Routine & {
  required: string[];
  missing: string[];
  available: boolean;
};

// Required equipment for a routine is the union of its exercises' gear (minus "none").
// A routine is available when you own all of it.
async function routineRequirements(): Promise<Map<number, Set<string>>> {
  const db = await getDb();
  const rows = await db
    .select({ routineId: routineExercises.routineId, equipment: exercises.equipment })
    .from(routineExercises)
    .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id));
  const req = new Map<number, Set<string>>();
  for (const r of rows) {
    const set = req.get(r.routineId) ?? new Set<string>();
    for (const item of r.equipment) if (item !== "none") set.add(item);
    req.set(r.routineId, set);
  }
  return req;
}

export async function getRoutineCards(location: Location): Promise<RoutineCard[]> {
  const db = await getDb();
  const p = await getProfile();
  const owned = ownedFor(p, location);
  const all = await db.select().from(routines).orderBy(routines.id);
  const req = await routineRequirements();

  return all.map((r) => {
    const required = [...(req.get(r.id) ?? new Set<string>())];
    const missing = required.filter((item) => !isOwned(item, owned));
    return { ...r, required, missing, available: missing.length === 0 };
  });
}

export type RoutineDetail = {
  routine: Routine;
  items: (RoutineExercise & { exercise: Exercise })[];
};

export async function getRoutineDetail(slug: string): Promise<RoutineDetail | null> {
  const db = await getDb();
  const [routine] = await db.select().from(routines).where(eq(routines.slug, slug));
  if (!routine) return null;

  const links = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routine.id))
    .orderBy(routineExercises.position);

  const exIds = links.map((l) => l.exerciseId);
  const exRows = exIds.length
    ? await db.select().from(exercises).where(inArray(exercises.id, exIds))
    : [];
  const exById = new Map(exRows.map((e) => [e.id, e]));

  return {
    routine,
    items: links.map((l) => ({ ...l, exercise: exById.get(l.exerciseId)! })),
  };
}

export async function getRecentWorkouts(limit = 30): Promise<(Workout & { routineName: string | null })[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(workouts)
    .orderBy(desc(workouts.date), desc(workouts.id))
    .limit(limit);

  const routineIds = [...new Set(rows.map((r) => r.routineId).filter((x): x is number => x != null))];
  const rNames = routineIds.length
    ? await db.select({ id: routines.id, name: routines.name }).from(routines).where(inArray(routines.id, routineIds))
    : [];
  const nameById = new Map(rNames.map((r) => [r.id, r.name]));

  return rows.map((r) => ({ ...r, routineName: r.routineId ? nameById.get(r.routineId) ?? null : null }));
}

export async function getStreak(): Promise<StreakInfo> {
  const db = await getDb();
  const p = await getProfile();
  const rows = await db.select({ date: workouts.date }).from(workouts);
  return computeStreak(rows.map((r) => r.date), p.weeklyGoalSessions);
}

// Suggest something available you haven't done lately, so it stays varied.
export async function getSuggestedRoutine(location: Location): Promise<RoutineCard | null> {
  const db = await getDb();
  const cards = (await getRoutineCards(location)).filter((c) => c.available);
  if (cards.length === 0) return null;

  const recent = await db
    .select({ routineId: workouts.routineId })
    .from(workouts)
    .where(gte(workouts.date, new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)))
    .orderBy(desc(workouts.date))
    .limit(5);
  const recentIds = new Set(recent.map((r) => r.routineId).filter((x) => x != null));

  const fresh = cards.filter((c) => !recentIds.has(c.id));
  const pool = fresh.length ? fresh : cards;
  // Rotate by day so the same suggestion doesn't sit there all week.
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return pool[dayOfYear % pool.length];
}
