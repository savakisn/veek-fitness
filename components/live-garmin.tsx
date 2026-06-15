"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// On app open, pull today's live Garmin numbers and refresh if anything changed.
// The card shows the last-synced values instantly, then updates within a second or two.
export function LiveGarmin({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;
    fetch("/api/garmin/live", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.updated) router.refresh();
      })
      .catch(() => {});
  }, [enabled, router]);

  return null;
}
