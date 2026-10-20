import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { getDb } from "./index";
import { dayCalls, workouts } from "./schema";
import type { User } from "./schema";
import { getRoutineCards, getSuggestedRoutine, getTrainingLoad, type Location, type RoutineCard } from "./queries";
import { getLatestMetrics } from "./insights";
import { daysAgoISO, todayISO } from "../format";

// What the call was made from, so a later engine can be backtested on what was
// known at the time rather than on data that synced afterwards.
async function snapshotInputs(userId: number): Promise<Record<string, number>> {
  const [latest, training] = await Promise.all([getLatestMetrics(userId), getTrainingLoad(userId)]);
  return { ...latest, load_acute: training.acuteWeek, load_chronic: training.chronicWeek, load_ratio: training.ratio };
}

// The day's suggestion, fixed once made. Without this the pick changed as soon as
// the routine was done, because the picker skips anything done recently.
export async function getTodaysCall(location: Location, user: User): Promise<RoutineCard | null> {
  const db = await getDb();
  const today = todayISO();
  const [existing] = await db
    .select({ routineId: dayCalls.routineId })
    .from(dayCalls)
    .where(
      and(
        eq(dayCalls.userId, user.id),
        eq(dayCalls.date, today),
        eq(dayCalls.kind, "suggested"),
        eq(dayCalls.location, location),
      ),
    );
  if (existing) {
    const card = (await getRoutineCards(location, user)).find((c) => c.id === existing.routineId && c.available);
    if (card) return card;
  }

  const pick = await getSuggestedRoutine(location, user);
  if (!pick) return null;
  const inputs = await snapshotInputs(user.id);
  await db
    .insert(dayCalls)
    .values({ userId: user.id, date: today, kind: "suggested", location, routineId: pick.id, inputs })
    .onConflictDoUpdate({
      target: [dayCalls.userId, dayCalls.date, dayCalls.kind, dayCalls.location],
      set: { routineId: pick.id, inputs },
    });
  return pick;
}

// The coach's pick replaces any earlier one that day; the latest ask is the call.
export async function recordCoachCall(
  user: User,
  location: Location,
  routineId: number,
  reason: string,
  feeling: string,
): Promise<void> {
  const db = await getDb();
  const inputs = await snapshotInputs(user.id);
  const row = { routineId, reason: reason || null, note: feeling.trim() || null, inputs };
  await db
    .insert(dayCalls)
    .values({ userId: user.id, date: todayISO(), kind: "coach", location, ...row })
    .onConflictDoUpdate({ target: [dayCalls.userId, dayCalls.date, dayCalls.kind, dayCalls.location], set: row });
}

export type CallOutcomes = { days: number; followed: number; other: number; skipped: number };

// Each past day with a call counts once: followed if any of that day's calls was
// done, other if something else was logged, skipped if nothing was. Today is left
// out because it isn't over.
export async function getCallOutcomes(userId: number, days = 28): Promise<CallOutcomes> {
  const db = await getDb();
  const since = daysAgoISO(days);
  const today = todayISO();
  const [calls, done] = await Promise.all([
    db
      .select({ date: dayCalls.date, routineId: dayCalls.routineId })
      .from(dayCalls)
      .where(and(eq(dayCalls.userId, userId), gte(dayCalls.date, since))),
    db
      .select({ date: workouts.date, routineId: workouts.routineId })
      .from(workouts)
      .where(and(eq(workouts.userId, userId), gte(workouts.date, since))),
  ]);

  const called = new Map<string, Set<number>>();
  for (const c of calls) {
    if (c.date >= today) continue;
    const set = called.get(c.date) ?? new Set<number>();
    set.add(c.routineId);
    called.set(c.date, set);
  }

  const out: CallOutcomes = { days: called.size, followed: 0, other: 0, skipped: 0 };
  for (const [date, ids] of called) {
    const that = done.filter((w) => w.date === date);
    if (that.some((w) => w.routineId != null && ids.has(w.routineId))) out.followed++;
    else if (that.length > 0) out.other++;
    else out.skipped++;
  }
  return out;
}
