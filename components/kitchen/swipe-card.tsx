"use client";

import { useRef, useState, type ReactNode } from "react";
import { Bookmark, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 80;

// Swipe right to bookmark, left for "not this week". Touch-only flourish; the
// card's own buttons do the same thing for mouse/keyboard.
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
  const startX = useRef<number | null>(null);

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
          startX.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          if (startX.current != null) setDx(e.touches[0].clientX - startX.current);
        }}
        onTouchEnd={() => {
          if (dx <= -THRESHOLD) onSwipeLeft?.();
          else if (dx >= THRESHOLD) onSwipeRight?.();
          setDx(0);
          startX.current = null;
        }}
        style={{ transform: `translateX(${dx}px)` }}
        className={cn("touch-pan-y", dx === 0 && "transition-transform duration-200")}
      >
        {children}
      </div>
    </div>
  );
}
