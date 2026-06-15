"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workouts, users, household, aiInsights } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getWeeklyStats } from "@/lib/db/insights";
import { generateText, AiUnavailableError } from "@/lib/ai";
import { fitnessSummaryPrompt } from "@/lib/ai/prompts";
import { todayISO } from "@/lib/format";

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

export async function logout() {
  (await cookies()).delete("vf_user");
  redirect("/login");
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
  const user = await getCurrentUser();
  await db.insert(workouts).values({
    userId: user.id,
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
  const user = await getCurrentUser();
  await db.delete(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));
  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateEquipment(location: "home" | "gym", items: string[]) {
  const db = await getDb();
  const user = await getCurrentUser();
  const col = location === "gym" ? { gymEquipment: items } : { homeEquipment: items };
  await db.update(users).set(col).where(eq(users.id, user.id));
  revalidatePath("/");
  revalidatePath("/routines");
  revalidatePath("/settings");
}

export async function updateWeeklyGoal(goal: number) {
  const db = await getDb();
  const user = await getCurrentUser();
  await db.update(users).set({ weeklyGoalSessions: goal }).where(eq(users.id, user.id));
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function updateKitchenPrefs(input: { householdSize: number; dislikes: string[] }) {
  const db = await getDb();
  await db
    .update(household)
    .set({ householdSize: input.householdSize, dislikes: input.dislikes })
    .where(eq(household.id, 1));
  revalidatePath("/settings");
  revalidatePath("/kitchen");
}

export async function refreshFitnessInsight(): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  try {
    const user = await getCurrentUser();
    const stats = await getWeeklyStats(user);
    const { system, prompt } = fitnessSummaryPrompt(stats);
    const text = await generateText(prompt, system);
    const db = await getDb();
    await db
      .insert(aiInsights)
      .values({ userId: user.id, kind: "weekly", date: todayISO(), text })
      .onConflictDoUpdate({ target: [aiInsights.userId, aiInsights.kind, aiInsights.date], set: { text } });
    revalidatePath("/");
    return { ok: true, text };
  } catch (e) {
    if (e instanceof AiUnavailableError) return { ok: false, error: "AI isn't set up yet. Add ANTHROPIC_API_KEY to enable it." };
    return { ok: false, error: "Couldn't generate an insight. Try again." };
  }
}
