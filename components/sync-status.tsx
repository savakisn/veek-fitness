"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Relative freshness ("Updated 3m ago") computed on the client, so it dodges
// timezone and clock-offset issues entirely. A large value is the tell that the
// watch hasn't uploaded to Garmin yet.
export function SyncStatus({ epoch }: { epoch?: number }) {
  const label = useSyncExternalStore(
    subscribe,
    () => {
      if (!epoch) return null;
      const secs = Math.floor(Date.now() / 1000) - epoch;
      if (secs < 90) return "Updated just now";
      if (secs < 3600) return `Updated ${Math.round(secs / 60)}m ago`;
      if (secs < 86400) return `Updated ${Math.round(secs / 3600)}h ago`;
      return `Updated ${Math.round(secs / 86400)}d ago`;
    },
    () => null,
  );

  if (!label) return null;
  return <span className="text-muted-foreground text-xs">{label}</span>;
}
