"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { metrics } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { METRIC } from "@/lib/metric-keys";
import { todayISO } from "@/lib/format";
import { AiLimitError, AiUnavailableError, aiClientForUser } from "@/lib/ai";
import { parseQuickLogText, shiftISO, type ParsedLog } from "@/lib/ai/quick-log";

export type QuickLogResult =
  | { ok: true; parsed: ParsedLog }
  | { ok: false; reason: "unavailable" | "limit" | "unparsed" | "error"; error: string };

// "45 min disc golf, back a little tight after, felt like a 3" -> editable fields.
// Nothing is saved here; the form confirms and saves through the normal path.
export async function parseQuickLog(text: string): Promise<QuickLogResult> {
  await getCurrentUser();
  try {
    const parsed = await parseQuickLogText(await aiClientForUser(), String(text ?? ""), todayISO());
    if (!parsed) return { ok: false, reason: "unparsed", error: "Couldn't read that. Use the form below." };
    return { ok: true, parsed };
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return { ok: false, reason: "unavailable", error: "AI isn't set up yet. Use the form below." };
    }
    if (e instanceof AiLimitError) return { ok: false, reason: "limit", error: e.message };
    return { ok: false, reason: "error", error: "Couldn't reach the assistant. Use the form below." };
  }
}

// Self-reported back status for a day: 0 fine, 1 tight, 2 sore. Source "manual".
export async function setBackStatus(date: string, status: number) {
  const user = await getCurrentUser();
  if (!Number.isInteger(status) || status < 0 || status > 2) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const today = todayISO();
  if (date > today || date < shiftISO(today, 30)) return;
  const db = await getDb();
  await db
    .insert(metrics)
    .values({ userId: user.id, date, metricType: METRIC.backStatus, value: status, source: "manual" })
    .onConflictDoUpdate({
      target: [metrics.userId, metrics.date, metrics.metricType, metrics.source],
      set: { value: status },
    });
  revalidatePath("/");
}
