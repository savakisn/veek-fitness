import Anthropic from "@anthropic-ai/sdk";

// The testable half of the AI seam: no server-only, no database. lib/ai/index.ts
// wires it to the real client and the ai_insights spend counter.

// Haiku-class: parsing and one-line text are short, so the cheapest current Haiku
// is plenty. Thinking is off and effort is low because none of this needs reasoning.
export const MODEL = "claude-haiku-5-5";

export class AiUnavailableError extends Error {
  constructor() {
    super("AI is unavailable: ANTHROPIC_API_KEY is not set.");
    this.name = "AiUnavailableError";
  }
}

export class AiLimitError extends Error {
  constructor(limit: number) {
    super(`Daily AI limit reached (${limit} calls). It resets tomorrow.`);
    this.name = "AiLimitError";
  }
}

export type CompleteRequest = {
  system?: string;
  prompt: string;
  maxTokens: number;
  // JSON Schema. When set, the API constrains the reply to it (structured outputs).
  schema?: Record<string, unknown>;
};

// Everything the app needs from a model: a prompt in, text out. Tests pass a fake.
export interface AiClient {
  complete(req: CompleteRequest): Promise<string>;
}

export function anthropicClient(apiKey: string): AiClient {
  const sdk = new Anthropic({ apiKey });
  return {
    async complete({ system, prompt, maxTokens, schema }) {
      const res = await sdk.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        thinking: { type: "disabled" },
        output_config: {
          effort: "low",
          ...(schema ? { format: { type: "json_schema" as const, schema } } : {}),
        },
        messages: [{ role: "user", content: prompt }],
      });
      const block = res.content.find((b) => b.type === "text");
      return block && block.type === "text" ? block.text : "";
    },
  };
}

let override: AiClient | null = null;
// Tests (and any future provider swap) inject a client here. Pass null to reset.
export function setAiClient(c: AiClient | null) {
  override = c;
}

export function getAiClient(): AiClient {
  if (override) return override;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiUnavailableError();
  return anthropicClient(apiKey);
}

export function isAiConfigured(): boolean {
  return override !== null || Boolean(process.env.ANTHROPIC_API_KEY);
}

// Tolerate stray fences or preamble around JSON (older prompts ask for "only JSON").
export function parseJsonLoose<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error("AI returned unparseable JSON.");
  }
}

// Daily spend cap. One counter row per user per day (ai_insights kind "ai_calls").
export const DEFAULT_DAILY_LIMIT = 60;

export interface CallCounter {
  // Atomically add one call for the user on this date and return the new count.
  increment(userId: number, date: string): Promise<number>;
}

export function dailyLimit(env: string | undefined = process.env.AI_DAILY_LIMIT): number {
  const n = Number(env);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
}

// Counts the call first, then refuses past the limit. Refused calls still bump the
// counter, but nothing is sent to the API.
export async function reserveCall(counter: CallCounter, userId: number, date: string, limit = dailyLimit()) {
  const n = await counter.increment(userId, date);
  if (n > limit) throw new AiLimitError(limit);
}
