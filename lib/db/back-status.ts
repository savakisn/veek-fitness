import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "./index";
import { metrics } from "./schema";
import { METRIC } from "../metric-keys";
import { todayISO } from "../format";

export type BackStatus = 0 | 1 | 2; // fine, tight, sore

// Today's self-reported back, or null when it hasn't been checked in yet.
export async function getBackStatus(userId: number, date: string = todayISO()): Promise<BackStatus | null> {
  const db = await getDb();
  const [row] = await db
    .select({ value: metrics.value })
    .from(metrics)
    .where(
      and(
        eq(metrics.userId, userId),
        eq(metrics.date, date),
        eq(metrics.metricType, METRIC.backStatus),
        eq(metrics.source, "manual"),
      ),
    );
  const v = row?.value;
  return v === 0 || v === 1 || v === 2 ? v : null;
}
