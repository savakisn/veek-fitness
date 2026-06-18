"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// On app open, pull today's live Garmin numbers and refresh if anything changed.
// The card shows the last-synced values instantly, then updates within a second or two.
export function LiveGarmin({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const ran = useRef(false);
  const interacted = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;

    // If the user taps or scrolls before the refresh fires, skip it — a
    // router.refresh() mid-tap cancels their navigation (the "first tap does
    // nothing" bug). They'll get fresh data on the next load anyway.
    const mark = () => {
      interacted.current = true;
    };
    window.addEventListener("touchstart", mark, { once: true, passive: true });
    window.addEventListener("pointerdown", mark, { once: true });

    fetch("/api/garmin/live", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.updated && !interacted.current) router.refresh();
      })
      .catch(() => {})
      .finally(() => {
        window.removeEventListener("touchstart", mark);
        window.removeEventListener("pointerdown", mark);
      });
  }, [enabled, router]);

  return null;
}
