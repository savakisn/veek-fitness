"use client";

import { useOptimistic, useTransition } from "react";
import { setBackStatus } from "@/app/(today)/actions";
import { saveOrWarn } from "@/lib/save-or-warn";
import { cn } from "@/lib/utils";

type Status = 0 | 1 | 2;

// Selected colour carries the meaning: fine is good-green, tight is amber, sore is red.
const CHOICES: { value: Status; label: string; on: string }[] = [
  { value: 0, label: "Fine", on: "bg-good/15 text-good ring-good/40" },
  { value: 1, label: "Tight", on: "bg-warn/15 text-warn ring-warn/40" },
  { value: 2, label: "Sore", on: "bg-destructive/15 text-destructive ring-destructive/40" },
];

// The one thing the watch can't know. Optimistic: the chip lights up on tap and
// rolls back with a toast if the save fails.
export function BackCheck({ current }: { current: Status | null }) {
  const [, start] = useTransition();
  const [shown, show] = useOptimistic(current);

  function pick(value: Status) {
    const next = shown === value ? null : value;
    start(async () => {
      show(next);
      await saveOrWarn(setBackStatus(next));
    });
  }

  return (
    <div className="flex items-center gap-3">
      <span id="back-label" className="text-eyebrow w-11 shrink-0">
        Back
      </span>
      <div role="group" aria-labelledby="back-label" className="grid flex-1 grid-cols-3 gap-2">
        {CHOICES.map((c) => {
          const on = shown === c.value;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={on}
              onClick={() => pick(c.value)}
              className={cn(
                "h-11 rounded-full text-sm font-bold ring-1 transition-colors ring-inset",
                on ? c.on : "bg-card text-muted-foreground ring-transparent active:bg-muted",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
