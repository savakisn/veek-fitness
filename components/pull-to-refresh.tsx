"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70; // px pulled before a release triggers a refresh

// Pull down at the top of the page to refresh — iOS standalone PWAs have no
// native pull-to-refresh, so we add our own. Fires the Garmin live pull, then
// re-renders the server components. Touch state lives in refs so the listeners
// are attached once, not re-bound on every frame of a pull.
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };
    function onStart(e: TouchEvent) {
      startY.current = window.scrollY <= 0 && !busyRef.current ? e.touches[0].clientY : null;
    }
    function onMove(e: TouchEvent) {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      // Deadzone so a normal tap (tiny drift) never engages the pull.
      if (dy > 14) set(Math.min((dy - 14) * 0.5, THRESHOLD + 20));
    }
    function onEnd() {
      if (startY.current == null) return;
      startY.current = null;
      if (pullRef.current < THRESHOLD) {
        set(0);
        return;
      }
      busyRef.current = true;
      setBusy(true);
      set(THRESHOLD);
      fetch("/api/garmin/live", { method: "POST" })
        .catch(() => {})
        .finally(() => {
          router.refresh();
          setTimeout(() => {
            busyRef.current = false;
            setBusy(false);
            set(0);
          }, 400);
        });
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [router]);

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
