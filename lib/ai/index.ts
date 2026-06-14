import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// One pluggable seam over Claude. Single user, low volume, so Haiku is plenty and
// cheap; bump MODEL to a Sonnet/Opus id for richer output at trivial extra cost.
const MODEL = "claude-haiku-4-5";

export class AiUnavailableError extends Error {
  constructor() {
    super("AI is unavailable: ANTHROPIC_API_KEY is not set.");
    this.name = "AiUnavailableError";
  }
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiUnavailableError();
  return new Anthropic({ apiKey });
}

function textOf(res: Anthropic.Message): string {
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export async function generateText(prompt: string, system?: string): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return textOf(res).trim();
}

// Haiku returns clean JSON when asked for it; tolerate stray fences or preamble.
export async function generateJSON<T>(prompt: string, system?: string): Promise<T> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const cleaned = textOf(res).replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error("AI returned unparseable JSON.");
  }
}
