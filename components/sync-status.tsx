"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Shows how fresh the synced data is, in the user's local time. Computed on the
// client (server snapshot is null) so it always uses the browser's timezone,
// not the server's UTC. A stale time means the watch hasn't uploaded to Garmin.
export function SyncStatus({ epoch }: { epoch?: number }) {
  const label = useSyncExternalStore(
    subscribe,
    () => {
      if (!epoch) return null;
      const d = new Date(epoch * 1000);
      const sameDay = new Date().toDateString() === d.toDateString();
      if (!sameDay) return "Updated yesterday";
      return `Updated ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    },
    () => null,
  );

  if (!label) return null;
  return <span className="text-muted-foreground text-xs">{label}</span>;
}
