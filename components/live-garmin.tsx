"use client";

import { useEffect, useRef } from "react";

// On Today open, quietly pull today's Garmin numbers so the DB is fresh for the
// next render. We deliberately do NOT router.refresh() here — a refresh mid-tap
// was cancelling the first navigation and made the app feel sluggish. The new
// values show on the next view or when you pull to refresh.
export function LiveGarmin({ enabled }: { enabled: boolean }) {
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;
    fetch("/api/garmin/live", { method: "POST" }).catch(() => {});
  }, [enabled]);

  return null;
}
