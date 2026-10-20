import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiInsights } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { Readiness } from "@/lib/readiness/types";
import { aiClientForUser } from "./index";
import { checkExplanation, explainWith } from "./readiness-core";

// Cached per user per day (ai_insights kind "readiness"). The cache stores the
// verdict it explained, so if later data flips the verdict the text is regenerated.
type Cached = { verdict: string; text: string };

export async function explainReadiness(r: Readiness): Promise<string> {
  const user = await getCurrentUser();
  const db = await getDb();
  const where = and(
    eq(aiInsights.userId, user.id),
    eq(aiInsights.kind, "readiness"),
    eq(aiInsights.date, r.date),
  );

  const [row] = await db.select().from(aiInsights).where(where);
  if (row) {
    try {
      const c = JSON.parse(row.text) as Cached;
      if (c.verdict === r.verdict && checkExplanation(c.text, r)) return c.text;
    } catch {}
  }

  const text = await explainWith(await aiClientForUser(), r);
  if (text !== r.headline) {
    const value: Cached = { verdict: r.verdict, text };
    await db
      .insert(aiInsights)
      .values({ userId: user.id, kind: "readiness", date: r.date, text: JSON.stringify(value) })
      .onConflictDoUpdate({
        target: [aiInsights.userId, aiInsights.kind, aiInsights.date],
        set: { text: JSON.stringify(value) },
      });
  }
  return text;
}

// For the Today screen: never throws, always returns something to show.
export async function explainReadinessSafe(r: Readiness): Promise<string> {
  try {
    return await explainReadiness(r);
  } catch {
    return r.headline;
  }
}
