"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70; // px pulled before a release triggers a refresh

// Pull down at the top of the page to refresh — iOS standalone PWAs have no
// native pull-to-refresh, so we add our own. Fires the Garmin live pull, then
// re-renders the server components.
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    function onStart(e: TouchEvent) {
      if (window.scrollY <= 0 && !busy) startY.current = e.touches[0].clientY;
      else startY.current = null;
    }
    function onMove(e: TouchEvent) {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) setPull(Math.min(dy * 0.5, THRESHOLD + 20));
    }
    function onEnd() {
      if (startY.current == null) return;
      if (pull >= THRESHOLD) {
        setBusy(true);
        setPull(THRESHOLD);
        fetch("/api/garmin/live", { method: "POST" })
          .catch(() => {})
          .finally(() => {
            router.refresh();
            setTimeout(() => {
              setBusy(false);
              setPull(0);
            }, 400);
          });
      } else {
        setPull(0);
      }
      startY.current = null;
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pull, busy, router]);

  if (pull <= 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ transform: `translateY(${pull - 24}px)`, opacity: Math.min(1, pull / THRESHOLD) }}
    >
      <div className="bg-card rounded-full border p-2 shadow-sm">
        <RefreshCw className={`text-primary size-5 ${busy ? "animate-spin" : ""}`} style={{ transform: `rotate(${pull * 3}deg)` }} />
      </div>
    </div>
  );
}
