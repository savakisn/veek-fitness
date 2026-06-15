"use client";

import { useRef, useState, type ReactNode } from "react";
import { Bookmark, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 120; // deliberate swipe, not a twitch

// Swipe right to bookmark, left for "not this week". Touch-only flourish; the
// card's own buttons do the same thing for mouse/keyboard. A direction lock
// keeps vertical scrolling from being read as a swipe.
export function SwipeCard({
  children,
  onSwipeLeft,
  onSwipeRight,
}: {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"h" | "v" | null>(null);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="text-primary absolute inset-y-0 left-0 flex items-center gap-1 pl-4 text-xs font-medium">
        <Bookmark className="size-4" /> Save
      </div>
      <div className="text-destructive absolute inset-y-0 right-0 flex items-center gap-1 pr-4 text-xs font-medium">
        Not this week <CalendarX className="size-4" />
      </div>
      <div
        onTouchStart={(e) => {
          start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          axis.current = null;
        }}
        onTouchMove={(e) => {
          if (!start.current) return;
          const mx = e.touches[0].clientX - start.current.x;
          const my = e.touches[0].clientY - start.current.y;
          if (!axis.current && (Math.abs(mx) > 12 || Math.abs(my) > 12)) {
            axis.current = Math.abs(mx) > Math.abs(my) ? "h" : "v";
          }
          if (axis.current === "h") setDx(mx);
        }}
        onTouchEnd={() => {
          if (axis.current === "h") {
            if (dx <= -THRESHOLD) onSwipeLeft?.();
            else if (dx >= THRESHOLD) onSwipeRight?.();
          }
          setDx(0);
          start.current = null;
          axis.current = null;
        }}
        style={{ transform: `translateX(${dx}px)` }}
        className={cn("touch-pan-y", dx === 0 && "transition-transform duration-200")}
      >
        {children}
      </div>
    </div>
  );
}
