"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workouts, profile } from "@/lib/db/schema";

export async function setLocation(location: "home" | "gym") {
  (await cookies()).set("vf_location", location, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/");
  revalidatePath("/routines");
}

export type LogWorkoutInput = {
  date: string;
  source?: "manual" | "routine";
  routineId?: number | null;
  location?: "home" | "gym" | "outdoor" | null;
  type?: string | null;
  durationMinutes?: number | null;
  perceivedEffort?: number | null;
  notes?: string | null;
};

export async function logWorkout(input: LogWorkoutInput) {
  const db = await getDb();
  await db.insert(workouts).values({
    date: input.date,
    source: input.source ?? "manual",
    routineId: input.routineId ?? null,
    location: input.location ?? null,
    type: input.type ?? null,
    durationMinutes: input.durationMinutes ?? null,
    perceivedEffort: input.perceivedEffort ?? null,
    notes: input.notes ?? null,
  });
  revalidatePath("/");
  revalidatePath("/history");
}

export async function deleteWorkout(id: number) {
  const db = await getDb();
  await db.delete(workouts).where(eq(workouts.id, id));
  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateEquipment(location: "home" | "gym", items: string[]) {
  const db = await getDb();
  const col = location === "gym" ? { gymEquipment: items } : { homeEquipment: items };
  await db.update(profile).set(col).where(eq(profile.id, 1));
  revalidatePath("/");
  revalidatePath("/routines");
  revalidatePath("/settings");
}

export async function updateWeeklyGoal(goal: number) {
  const db = await getDb();
  await db.update(profile).set({ weeklyGoalSessions: goal }).where(eq(profile.id, 1));
  revalidatePath("/");
  revalidatePath("/settings");
}
