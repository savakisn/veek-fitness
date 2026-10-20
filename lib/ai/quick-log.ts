import { z } from "zod";
import { parseJsonLoose, type AiClient } from "./core";

// Free-text "Tell Cadence" log. The model only extracts; this file decides what is
// allowed through. Anything out of range is clamped or dropped, never trusted.

export type ParsedLog = {
  type: string;
  durationMinutes: number | null;
  perceivedEffort: number | null; // 1-5
  date: string; // YYYY-MM-DD, never in the future
  back: { status: 0 | 1 | 2; note: string } | null; // 0 fine, 1 tight, 2 sore
  notes: string | null;
};

// What the model is asked for. Dates are relative (daysAgo) so the model never does
// calendar math; code resolves them.
const RawSchema = z.object({
  type: z.string().nullish(),
  durationMinutes: z.number().nullish(),
  perceivedEffort: z.number().nullish(),
  daysAgo: z.number().nullish(),
  backStatus: z.number().nullish(),
  backNote: z.string().nullish(),
  notes: z.string().nullish(),
});

export const QUICK_LOG_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    type: { type: ["string", "null"] },
    durationMinutes: { type: ["number", "null"] },
    perceivedEffort: { type: ["number", "null"] },
    daysAgo: { type: ["number", "null"] },
    backStatus: { type: ["number", "null"] },
    backNote: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
  },
  required: ["type", "durationMinutes", "perceivedEffort", "daysAgo", "backStatus", "backNote", "notes"],
  additionalProperties: false,
};

export const QUICK_LOG_SYSTEM = `You turn one casual sentence about exercise into a log entry. Extract only what the person said. Never invent details.
- type: short activity name, capitalized ("Disc golf", "Walk"). null if no activity is named.
- durationMinutes: whole minutes, null if not stated ("an hour" is 60).
- perceivedEffort: 1 easy, 2 light, 3 moderate, 4 hard, 5 all out. Use it only if effort is stated or clearly implied ("felt like a 3"), else null.
- daysAgo: 0 for today or unspecified, 1 for yesterday, 2 for two days ago, and so on.
- backStatus: only if their back is mentioned: 0 fine, 1 tight or a little off, 2 sore or hurting. Otherwise null. backNote is their own words about it, or null.
- notes: any other detail worth keeping, in their words, or null.`;

export function quickLogPrompt(text: string): string {
  return `Entry: """${text.slice(0, 600)}"""`;
}

export function shiftISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const clean = (s: string | null | undefined, max: number): string | null => {
  const t = (s ?? "").replace(/[—–]/g, ", ").replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
};

// Validate and clamp. Returns null when there is no usable activity.
export function sanitizeQuickLog(raw: unknown, today: string): ParsedLog | null {
  const p = RawSchema.safeParse(raw);
  if (!p.success) return null;
  const r = p.data;

  const type = clean(r.type, 60);
  if (!type) return null;

  let durationMinutes: number | null = null;
  if (typeof r.durationMinutes === "number" && Number.isFinite(r.durationMinutes) && r.durationMinutes > 0) {
    durationMinutes = Math.min(600, Math.round(r.durationMinutes));
  }

  let perceivedEffort: number | null = null;
  if (typeof r.perceivedEffort === "number" && Number.isFinite(r.perceivedEffort)) {
    const e = Math.round(r.perceivedEffort);
    if (e >= 1 && e <= 5) perceivedEffort = e;
  }

  // Future or absurd offsets fall back to today; the log can't be dated ahead.
  let daysAgo = 0;
  if (typeof r.daysAgo === "number" && Number.isInteger(r.daysAgo) && r.daysAgo >= 0 && r.daysAgo <= 30) {
    daysAgo = r.daysAgo;
  }

  let back: ParsedLog["back"] = null;
  if (r.backStatus === 0 || r.backStatus === 1 || r.backStatus === 2) {
    back = { status: r.backStatus, note: clean(r.backNote, 120) ?? "" };
  }

  return {
    type,
    durationMinutes,
    perceivedEffort,
    date: shiftISO(today, daysAgo),
    back,
    notes: clean(r.notes, 300),
  };
}

export async function parseQuickLogText(
  client: AiClient,
  text: string,
  today: string,
): Promise<ParsedLog | null> {
  const input = text.trim();
  if (!input) return null;
  const raw = await client.complete({
    system: QUICK_LOG_SYSTEM,
    prompt: quickLogPrompt(input),
    maxTokens: 400,
    schema: QUICK_LOG_JSON_SCHEMA,
  });
  let json: unknown;
  try {
    json = parseJsonLoose(raw);
  } catch {
    return null;
  }
  return sanitizeQuickLog(json, today);
}
