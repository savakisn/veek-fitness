"use client";

// Shows how fresh the synced data is, in the user's local time. A stale time is
// the tell that the watch hasn't uploaded to Garmin yet (open Garmin Connect).
export function SyncStatus({ epoch }: { epoch?: number }) {
  if (!epoch) return null;
  const d = new Date(epoch * 1000);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const sameDay = new Date().toDateString() === d.toDateString();
  return <span className="text-muted-foreground text-xs">Updated {sameDay ? time : "yesterday"}</span>;
}
