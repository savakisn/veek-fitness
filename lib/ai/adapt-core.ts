import { z } from "zod";
import { parseJsonLoose, type AiClient } from "./core";

// Routine adaptation inside a hard envelope. The model may only swap an exercise
// for one from the list code built (equipment owned, back-safe when required, no
// avoided category). validateSwaps re-checks every pick; one bad pick rejects the
// whole adaptation and the original routine stands.

export type AdaptExercise = {
  id: number;
  name: string;
  category: string;
  backSafe: boolean;
};

export type AdaptItem = AdaptExercise & { position: number };

export type AdaptLimits = { backSafeOnly: boolean; avoidCategories: string[] };

export type Swap = { fromId: number; toId: number; reason: string };

export type AdaptResult = {
  items: AdaptItem[];
  swaps: Swap[];
  adapted: boolean;
};

const RawSchema = z.object({
  swaps: z.array(
    z.object({
      fromId: z.number().int(),
      toId: z.number().int(),
      reason: z.string(),
    }),
  ),
});

export const ADAPT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    swaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          fromId: { type: "integer" },
          toId: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["fromId", "toId", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["swaps"],
  additionalProperties: false,
};

// The only exercises the model is shown, and the only ones it may pick.
export function allowedPool(available: AdaptExercise[], limits: AdaptLimits): AdaptExercise[] {
  return available.filter(
    (e) => (!limits.backSafeOnly || e.backSafe) && !limits.avoidCategories.includes(e.category),
  );
}

export const ADAPT_SYSTEM = `You adjust a workout routine for someone protecting their back. You may swap exercises, never add or remove them, and only for exercises in the ALLOWED list.
- Swap an exercise only if it would likely aggravate the sore spot or breaks the limits. Otherwise leave it alone. Zero swaps is a fine answer.
- Prefer a swap in the same category with a similar purpose.
- reason: one short plain sentence, no em dashes, no hype.
- Return JSON: {"swaps":[{"fromId":1,"toId":2,"reason":"..."}]}`;

export function adaptPrompt(opts: {
  routineName: string;
  items: AdaptItem[];
  pool: AdaptExercise[];
  limits: AdaptLimits;
  soreSpot: string | null;
}): string {
  const line = (e: AdaptExercise) => `- id ${e.id}: ${e.name} (${e.category}${e.backSafe ? "" : ", NOT back-safe"})`;
  return [
    `Routine: ${opts.routineName}`,
    ...opts.items.map(line),
    "",
    `Sore spot: ${opts.soreSpot || "none given"}.`,
    opts.limits.backSafeOnly ? "Back-safe exercises only." : "",
    opts.limits.avoidCategories.length ? `Skip categories: ${opts.limits.avoidCategories.join(", ")}.` : "",
    "",
    "ALLOWED replacements:",
    ...opts.pool.map(line),
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// Returns the swaps if every one is inside the envelope, else null.
export function validateSwaps(
  raw: unknown,
  items: AdaptItem[],
  pool: AdaptExercise[],
): Swap[] | null {
  const p = RawSchema.safeParse(raw);
  if (!p.success) return null;
  const inRoutine = new Set(items.map((i) => i.id));
  const poolIds = new Set(pool.map((e) => e.id));
  const from = new Set<number>();
  const to = new Set<number>();
  const out: Swap[] = [];
  for (const s of p.data.swaps) {
    if (!inRoutine.has(s.fromId)) return null; // swaps something that isn't in the routine
    if (!poolIds.has(s.toId)) return null; // unknown, unsafe, unowned or avoided
    if (s.toId === s.fromId) return null;
    if (inRoutine.has(s.toId)) return null; // no duplicates within the routine
    if (from.has(s.fromId) || to.has(s.toId)) return null;
    from.add(s.fromId);
    to.add(s.toId);
    const reason = s.reason.replace(/[—–]/g, ", ").replace(/\s+/g, " ").trim().slice(0, 160);
    out.push({ fromId: s.fromId, toId: s.toId, reason });
  }
  return out;
}

export function applySwaps(items: AdaptItem[], swaps: Swap[], pool: AdaptExercise[]): AdaptItem[] {
  const byId = new Map(pool.map((e) => [e.id, e]));
  return items.map((it) => {
    const s = swaps.find((x) => x.fromId === it.id);
    const next = s ? byId.get(s.toId) : null;
    return next ? { ...next, position: it.position } : it;
  });
}

export async function adaptWith(
  client: AiClient,
  input: {
    routine: { name: string; items: AdaptItem[] };
    exercisesAvailable: AdaptExercise[];
    limits: AdaptLimits;
    soreSpot?: string | null;
  },
): Promise<AdaptResult> {
  const original: AdaptResult = { items: input.routine.items, swaps: [], adapted: false };
  const pool = allowedPool(input.exercisesAvailable, input.limits);
  if (!pool.length) return original;

  let swaps: Swap[] | null = null;
  try {
    const raw = await client.complete({
      system: ADAPT_SYSTEM,
      prompt: adaptPrompt({
        routineName: input.routine.name,
        items: input.routine.items,
        pool,
        limits: input.limits,
        soreSpot: input.soreSpot?.trim().slice(0, 80) || null,
      }),
      maxTokens: 800,
      schema: ADAPT_JSON_SCHEMA,
    });
    swaps = validateSwaps(parseJsonLoose(raw), input.routine.items, pool);
  } catch {
    return original;
  }
  if (!swaps || !swaps.length) return original;
  return { items: applySwaps(input.routine.items, swaps, pool), swaps, adapted: true };
}
