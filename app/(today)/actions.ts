"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { metrics } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { METRIC } from "@/lib/metric-keys";
import { todayISO } from "@/lib/format";

// Today's back check-in: 0 fine, 1 tight, 2 sore. null clears it (tapping the
// selected chip again), so a mis-tap doesn't leave a reading behind.
export async function setBackStatus(status: 0 | 1 | 2 | null) {
  const user = await getCurrentUser();
  if (status !== null && status !== 0 && status !== 1 && status !== 2) throw new Error("Bad back status.");
  const db = await getDb();
  const date = todayISO();
  const key = and(
    eq(metrics.userId, user.id),
    eq(metrics.date, date),
    eq(metrics.metricType, METRIC.backStatus),
    eq(metrics.source, "manual"),
  );
  if (status === null) {
    await db.delete(metrics).where(key);
  } else {
    await db
      .insert(metrics)
      .values({ userId: user.id, date, metricType: METRIC.backStatus, value: status, source: "manual" })
      .onConflictDoUpdate({
        target: [metrics.userId, metrics.date, metrics.metricType, metrics.source],
        set: { value: status },
      });
  }
  // The verdict reads the back check, so Today re-renders with it.
  revalidatePath("/");
}
