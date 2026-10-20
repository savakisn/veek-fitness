"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workouts, users, household, aiInsights, metrics } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getRoutineCards, getRecentWorkouts } from "@/lib/db/queries";
import { getWeeklyStats } from "@/lib/db/insights";
import { recordCoachCall } from "@/lib/db/day-calls";
import { generateJSON, AiUnavailableError } from "@/lib/ai";
import { fitnessSummaryPrompt, workoutCoachPrompt, type CoachPick, type WeeklyRecap } from "@/lib/ai/prompts";
import { todayISO } from "@/lib/format";
import { z } from "zod";
import * as v from "@/lib/validate";

export async function setLocation(location: "home" | "gym") {
  await getCurrentUser();
  const loc = v.check(v.location, location);
  if (!loc) return;
  (await cookies()).set("vf_location", loc, {
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

const logWorkoutSchema = z.object({
  date: v.isoDate,
  source: z.enum(["manual", "routine"]).nullish(),
  routineId: v.id.nullish(),
  location: z.enum(["home", "gym", "outdoor"]).nullish(),
  type: v.text(80).nullish(),
  durationMinutes: z.number().int().min(1).max(1440).nullish(),
  perceivedEffort: z.number().int().min(1).max(5).nullish(),
  notes: v.text(2000).nullish(),
});

export async function logWorkout(input: LogWorkoutInput) {
  const db = await getDb();
  const user = await getCurrentUser();
  const w = v.check(logWorkoutSchema, input);
  if (!w) throw new Error("Invalid workout.");
  await db.insert(workouts).values({
    userId: user.id,
    date: w.date,
    source: w.source ?? "manual",
    routineId: w.routineId ?? null,
    location: w.location ?? null,
    type: w.type || null,
    durationMinutes: w.durationMinutes ?? null,
    perceivedEffort: w.perceivedEffort ?? null,
    notes: w.notes || null,
  });
  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateWorkoutType(id: number, type: string) {
  const db = await getDb();
  const user = await getCurrentUser();
  const wid = v.check(v.id, id);
  const t = v.check(v.text(80), type);
  if (!wid || t === null) return;
  await db
    .update(workouts)
    .set({ type: t || null })
    .where(and(eq(workouts.id, wid), eq(workouts.userId, user.id)));
  revalidatePath("/history");
  revalidatePath("/");
  revalidatePath(`/workout/${id}`);
}

function nearestDistance(samples: { t: number; d: number }[], sec: number): number | null {
  if (!samples.length) return null;
  let best = samples[0];
  for (const s of samples) if (Math.abs(s.t - sec) < Math.abs(best.t - sec)) best = s;
  return best.d;
}

export async function updateWorkoutTrim(id: number, startSec: number, endSec: number) {
  const db = await getDb();
  const user = await getCurrentUser();
  const secs = z.number().finite().min(0).max(86400);
  if (!v.check(v.id, id) || !v.check(secs, startSec) || !v.check(secs, endSec) || endSec <= startSec) return;
  const [w] = await db.select().from(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));
  if (!w) return;
  const detail = { ...(w.detail ?? {}) } as NonNullable<typeof w.detail>;
  const durationMinutes = Math.max(1, Math.round((endSec - startSec) / 60));
  if (detail.distSamples?.length) {
    const dStart = nearestDistance(detail.distSamples, startSec);
    const dEnd = nearestDistance(detail.distSamples, endSec);
    if (dStart != null && dEnd != null) detail.distanceKm = Math.round(((dEnd - dStart) / 1000) * 100) / 100;
  }
  detail.trim = { startSec: Math.round(startSec), endSec: Math.round(endSec) };
  await db
    .update(workouts)
    .set({ durationMinutes, detail })
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));
  revalidatePath(`/workout/${id}`);
  revalidatePath("/history");
  revalidatePath("/");
}

export async function logWeight(lbs: number, date?: string) {
  const db = await getDb();
  const user = await getCurrentUser();
  if (typeof lbs !== "number" || !Number.isFinite(lbs)) return;
  const value = Math.round(lbs * 10) / 10;
  if (!(value > 0) || value > 1000) return;
  const day = date === undefined ? todayISO() : v.check(v.isoDate, date);
  if (!day) return;
  await db
    .insert(metrics)
    .values({ userId: user.id, date: day, metricType: "weight", value, source: "manual" })
    .onConflictDoUpdate({
      target: [metrics.userId, metrics.date, metrics.metricType, metrics.source],
      set: { value },
    });
  revalidatePath("/");
  revalidatePath("/metric/weight");
}

export async function deleteWorkout(id: number) {
  const db = await getDb();
  const user = await getCurrentUser();
  if (!v.check(v.id, id)) return;
  await db.delete(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, user.id)));
  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateEquipment(location: "home" | "gym", items: string[]) {
  const db = await getDb();
  const user = await getCurrentUser();
  const loc = v.check(v.location, location);
  const list = v.check(z.array(v.name(60)).max(100), items);
  if (!loc || !list) return;
  const col = loc === "gym" ? { gymEquipment: list } : { homeEquipment: list };
  await db.update(users).set(col).where(eq(users.id, user.id));
  revalidatePath("/");
  revalidatePath("/routines");
  revalidatePath("/settings");
}

export async function updateWeeklyGoal(goal: number) {
  const db = await getDb();
  const user = await getCurrentUser();
  const g = v.check(z.number().int().min(1).max(14), goal);
  if (g === null) return;
  await db.update(users).set({ weeklyGoalSessions: g }).where(eq(users.id, user.id));
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function updateKitchenPrefs(input: { householdSize: number; dislikes: string[] }) {
  await getCurrentUser();
  const db = await getDb();
  const p = v.check(
    z.object({ householdSize: z.number().int().min(1).max(20), dislikes: z.array(v.name(60)).max(100) }),
    input,
  );
  if (!p) return;
  await db
    .update(household)
    .set({ householdSize: p.householdSize, dislikes: p.dislikes })
    .where(eq(household.id, 1));
  revalidatePath("/settings");
  revalidatePath("/kitchen");
}

export async function suggestWorkout(input: {
  location: "home" | "gym";
  feeling: string;
}): Promise<{ ok: true; slug: string; name: string; reason: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  const parsed = v.check(z.object({ location: v.location, feeling: v.text(500) }), input);
  if (!parsed) return { ok: false, error: "That didn't look right. Try again." };
  input = parsed;
  try {
    const cards = (await getRoutineCards(input.location, user)).filter((c) => c.available);
    if (cards.length === 0) return { ok: false, error: "No routines available for that spot yet." };
    const recent = await getRecentWorkouts(user.id, 5);
    const { system, prompt } = workoutCoachPrompt({
      available: cards.map((c) => ({ slug: c.slug, name: c.name, goalTag: c.goalTag })),
      recent: recent.map((r) => r.routineName ?? r.type ?? "workout"),
      feeling: input.feeling,
      location: input.location,
    });
    const pick = await generateJSON<CoachPick>(prompt, system);
    const chosen = cards.find((c) => c.slug === pick.routineSlug) ?? cards[0];
    // The log must never cost the person their suggestion.
    await recordCoachCall(user, input.location, chosen.id, pick.reason ?? "", input.feeling).catch((e) =>
      console.error("recordCoachCall failed", e),
    );
    return { ok: true, slug: chosen.slug, name: chosen.name, reason: pick.reason ?? "" };
  } catch (e) {
    if (e instanceof AiUnavailableError) return { ok: false, error: "AI isn't set up yet. Add ANTHROPIC_API_KEY to enable it." };
    return { ok: false, error: "Couldn't get a suggestion. Try again." };
  }
}

export async function refreshFitnessInsight(): Promise<
  { ok: true; recap: WeeklyRecap } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  try {
    const stats = await getWeeklyStats(user);
    const { system, prompt } = fitnessSummaryPrompt(stats);
    const recap = await generateJSON<WeeklyRecap>(prompt, system);
    const db = await getDb();
    await db
      .insert(aiInsights)
      .values({ userId: user.id, kind: "weekly", date: todayISO(), text: JSON.stringify(recap) })
      .onConflictDoUpdate({ target: [aiInsights.userId, aiInsights.kind, aiInsights.date], set: { text: JSON.stringify(recap) } });
    revalidatePath("/");
    return { ok: true, recap };
  } catch (e) {
    if (e instanceof AiUnavailableError) return { ok: false, error: "AI isn't set up yet. Add ANTHROPIC_API_KEY to enable it." };
    return { ok: false, error: "Couldn't generate an insight. Try again." };
  }
}
