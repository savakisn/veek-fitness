"use client";

import { useTransition } from "react";
import { setLocation } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { Location } from "@/lib/db/queries";

export function LocationToggle({ value }: { value: Location }) {
  const [pending, start] = useTransition();
  return (
    <div className={cn("bg-muted/50 inline-flex rounded-lg border p-0.5", pending && "opacity-60")}>
      {(["home", "gym"] as const).map((loc) => (
        <button
          key={loc}
          type="button"
          disabled={pending}
          onClick={() => start(() => setLocation(loc))}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm capitalize transition-colors",
            value === loc ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
