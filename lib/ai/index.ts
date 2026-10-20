import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiInsights } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { getAiClient, parseJsonLoose, reserveCall, type AiClient, type CallCounter } from "./core";

export {
  AiUnavailableError,
  AiLimitError,
  MODEL,
  setAiClient,
  isAiConfigured,
  type AiClient,
  type CompleteRequest,
} from "./core";

// One pluggable seam over Claude. Every call is counted per user per day in
// ai_insights (kind "ai_calls") and refused past the daily cap.
const counter: CallCounter = {
  async increment(userId, date) {
    const db = await getDb();
    const [row] = await db
      .insert(aiInsights)
      .values({ userId, kind: "ai_calls", date, text: "1" })
      .onConflictDoUpdate({
        target: [aiInsights.userId, aiInsights.kind, aiInsights.date],
        set: { text: sql`(${aiInsights.text}::int + 1)::text` },
      })
      .returning({ text: aiInsights.text });
    return Number(row.text);
  },
};

export async function aiClientForUser(): Promise<AiClient> {
  const client = getAiClient(); // throws AiUnavailableError first, before counting
  const user = await getCurrentUser();
  await reserveCall(counter, user.id, todayISO());
  return client;
}

export async function generateText(prompt: string, system?: string): Promise<string> {
  const client = await aiClientForUser();
  return (await client.complete({ system, prompt, maxTokens: 2048 })).trim();
}

// With a JSON Schema the reply is schema-constrained by the API; without one it is
// parsed leniently, as before. Callers should still validate what comes back.
export async function generateJSON<T>(
  prompt: string,
  system?: string,
  schema?: Record<string, unknown>,
): Promise<T> {
  const client = await aiClientForUser();
  return parseJsonLoose<T>(await client.complete({ system, prompt, maxTokens: 4096, schema }));
}
