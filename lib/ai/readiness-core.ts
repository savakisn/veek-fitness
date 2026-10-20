import type { Readiness } from "../readiness/types";
import type { AiClient } from "./core";

// The deterministic engine decides the verdict; the model only says why, in its own
// words, using nothing but the numbers it was handed. checkExplanation enforces that.

export const READINESS_SYSTEM = `You explain a training-readiness verdict to the person it is about, in one or two plain sentences.
- Use only the signals and numbers given. Do not add numbers, causes, or advice that are not in the input.
- Do not change or second-guess the verdict.
- Plain and specific, like a sharp friend. No em dashes, no hype, no flattery, no emojis.
- Return only the sentences.`;

export function readinessPrompt(r: Readiness): string {
  const lines = r.signals
    .filter((s) => s.effect !== "missing")
    .map((s) => `- ${s.label}: ${s.note} (${s.effect})`);
  return [
    `Verdict: ${r.verdict}${r.score != null ? `, score ${r.score}` : ""}, confidence ${r.confidence}.`,
    `Engine headline: ${r.headline}`,
    "Signals:",
    ...lines,
    "",
    "Write the one or two sentences.",
  ].join("\n");
}

const NUM = /\d+(?:\.\d+)?/g;

function numbersIn(text: string): number[] {
  return (text.match(NUM) ?? []).map(Number);
}

// Every number the output may legitimately repeat: anything in the headline and
// signal notes, plus the raw values, baselines and score (and their roundings).
export function allowedNumbers(r: Readiness): Set<number> {
  const out = new Set<number>();
  const add = (n: number | null | undefined) => {
    if (n == null || !Number.isFinite(n)) return;
    const a = Math.abs(n);
    out.add(a);
    out.add(Math.round(a));
    out.add(Math.round(a * 10) / 10);
  };
  for (const n of numbersIn(r.headline)) add(n);
  add(r.score);
  for (const s of r.signals) {
    for (const n of numbersIn(s.note)) add(n);
    add(s.value);
    add(s.baseline);
  }
  return out;
}

// Returns the cleaned sentence(s), or null if the output breaks a rule.
export function checkExplanation(text: string, r: Readiness): string | null {
  const t = text.replace(/[—–]/g, ", ").replace(/\s+/g, " ").trim();
  if (!t || t.length > 280) return null;
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 2) return null;
  const allowed = allowedNumbers(r);
  for (const n of numbersIn(t)) if (!allowed.has(n)) return null;
  return t;
}

// Never throws on a bad reply (client errors still propagate to the caller).
export async function explainWith(client: AiClient, r: Readiness): Promise<string> {
  const raw = await client.complete({ system: READINESS_SYSTEM, prompt: readinessPrompt(r), maxTokens: 200 });
  return checkExplanation(raw, r) ?? r.headline;
}
