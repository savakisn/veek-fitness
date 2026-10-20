"use server";

import { getDb } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getRoutineDetail } from "@/lib/db/queries";
import { getLocation } from "@/lib/location";
import { isOwned } from "@/lib/equipment";
import { AiLimitError, AiUnavailableError } from "@/lib/ai";
import { adaptRoutine, type AdaptLimits } from "@/lib/ai/adapt";

export type AdaptedRoutine =
  | {
      ok: true;
      adapted: boolean;
      items: { exerciseId: number; name: string; category: string; backSafe: boolean }[];
      swaps: { fromName: string; toName: string; reason: string }[];
    }
  | { ok: false; error: string };

// Suggests back-safe swaps for a routine. Read-only: it returns the adapted list and
// saves nothing. Limits default to back-safe only; callers (the readiness engine)
// can pass stricter ones.
export async function adaptRoutineAction(
  slug: string,
  soreSpot: string,
  limits: AdaptLimits = { backSafeOnly: true, avoidCategories: [] },
): Promise<AdaptedRoutine> {
  const user = await getCurrentUser();
  const detail = await getRoutineDetail(slug);
  if (!detail) return { ok: false, error: "Routine not found." };

  const owned = (await getLocation()) === "gym" ? user.gymEquipment : user.homeEquipment;
  const all = await (await getDb()).select().from(exercises);
  const exercisesAvailable = all
    .filter((e) => e.equipment.every((item) => isOwned(item, owned)))
    .map((e) => ({ id: e.id, name: e.name, category: e.category, backSafe: e.backSafe }));

  const safeLimits: AdaptLimits = {
    backSafeOnly: Boolean(limits?.backSafeOnly),
    avoidCategories: Array.isArray(limits?.avoidCategories)
      ? limits.avoidCategories.filter((c): c is string => typeof c === "string").slice(0, 10)
      : [],
  };

  try {
    const result = await adaptRoutine({
      routine: {
        name: detail.routine.name,
        items: detail.items.map((i) => ({
          id: i.exercise.id,
          name: i.exercise.name,
          category: i.exercise.category,
          backSafe: i.exercise.backSafe,
          position: i.position,
        })),
      },
      exercisesAvailable,
      limits: safeLimits,
      soreSpot: soreSpot.slice(0, 80),
    });
    const nameOf = new Map([...exercisesAvailable, ...detail.items.map((i) => i.exercise)].map((e) => [e.id, e.name]));
    return {
      ok: true,
      adapted: result.adapted,
      items: result.items.map((i) => ({ exerciseId: i.id, name: i.name, category: i.category, backSafe: i.backSafe })),
      swaps: result.swaps.map((s) => ({
        fromName: nameOf.get(s.fromId) ?? "",
        toName: nameOf.get(s.toId) ?? "",
        reason: s.reason,
      })),
    };
  } catch (e) {
    if (e instanceof AiUnavailableError) return { ok: false, error: "AI isn't set up yet. Add ANTHROPIC_API_KEY to enable it." };
    if (e instanceof AiLimitError) return { ok: false, error: e.message };
    return { ok: false, error: "Couldn't adapt that routine right now." };
  }
}
