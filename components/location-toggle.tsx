"use client";

import { useTransition } from "react";
import { setLocation } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { Location } from "@/lib/db/queries";

export function LocationToggle({ value }: { value: Location }) {
  const [pending, start] = useTransition();
  return (
    <div
      role="group"
      aria-label="Working out at"
      className={cn("bg-card inline-flex h-11 shrink-0 rounded-full", pending && "opacity-60")}
    >
      {(["home", "gym"] as const).map((loc) => (
        <button
          key={loc}
          type="button"
          disabled={pending}
          aria-pressed={value === loc}
          onClick={() => start(() => setLocation(loc))}
          className={cn(
            // Full-height buttons keep the whole pill tappable; the inset ring draws the selected chip.
            "rounded-full px-4 text-sm font-bold capitalize transition-colors",
            value === loc ? "bg-muted text-foreground ring-card ring-4 ring-inset" : "text-muted-foreground",
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
