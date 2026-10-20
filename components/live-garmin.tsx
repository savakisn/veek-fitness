"use client";

import { useEffect, useRef } from "react";

const FRESH_SECONDS = 10 * 60;

// On Today open, quietly pull today's Garmin numbers so the DB is fresh for the
// next render. Skipped when the last pull is under 10 minutes old, so reopening
// the app doesn't spend a Garmin login on every launch. We deliberately do NOT
// router.refresh() here; a refresh mid-tap was cancelling the first navigation.
export function LiveGarmin({ enabled, lastSync }: { enabled: boolean; lastSync: number | null }) {
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;
    if (lastSync && Date.now() / 1000 - lastSync < FRESH_SECONDS) return;
    fetch("/api/garmin/live", { method: "POST" }).catch(() => {});
  }, [enabled, lastSync]);

  return null;
}
