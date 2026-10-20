import Link from "next/link";
import { Play } from "lucide-react";
import type { Readiness } from "@/lib/readiness/types";
import type { Location, RoutineCard } from "@/lib/db/queries";
import { goalLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OverrideSheet, type RoutineOption } from "./override-sheet";

const LOW_KEYS = ["hrv", "sleep", "resting_hr", "body_battery", "load"];

// The verdict word is already the headline, so drop a leading "Easy day." or
// "Rest." from the engine's sentence rather than say it twice.
function reason(headline: string, verdict: string): string {
  const rest = headline.replace(new RegExp(`^${verdict}( day)?[.!:,]\\s*`, "i"), "");
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : headline;
}

// The one answer on open: what kind of day it is, and the routine that fits it.
// The verdict word is the headline; everything else on Today supports it.
export function VerdictHero({
  readiness,
  routine,
  swappedFrom,
  options,
  location,
}: {
  readiness: Readiness;
  routine: RoutineCard | null;
  swappedFrom: string | null;
  options: RoutineOption[];
  location: Location;
}) {
  const { verdict, headline, confidence } = readiness;
  const rest = verdict === "rest";
  const withNorm = readiness.signals.filter((s) => LOW_KEYS.includes(s.key) && s.baseline != null).length;

  return (
    <section
      data-verdict={verdict}
      aria-labelledby="verdict"
      className="rounded-[28px] bg-[color-mix(in_oklch,var(--v)_7%,var(--card))] px-5 pt-6 pb-4"
    >
      <h1
        id="verdict"
        className="text-display animate-in fade-in slide-in-from-bottom-2 -ml-1 text-(--v) duration-500 motion-reduce:animate-none"
      >
        {verdict}
      </h1>
      <p className="mt-4 text-lg leading-snug font-bold text-balance">{reason(headline, verdict)}</p>
      {confidence === "low" ? (
        <p className="text-muted-foreground mt-1.5 text-sm">
          {withNorm === 0
            ? "No personal norms yet. Wear the watch overnight for a week to sharpen this."
            : `Low confidence: ${withNorm} of 5 signals have a norm so far.`}
        </p>
      ) : null}

      <div className="mt-6 border-t border-[color-mix(in_oklch,var(--v)_22%,transparent)] pt-4">
        {routine ? (
          <>
            <p className="text-muted-foreground text-xs">{rest ? "If you want to move" : "Today's routine"}</p>
            <p className="mt-0.5 text-[1.375rem] leading-7 font-black tracking-[-0.01em]">{routine.name}</p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {goalLabel(routine.goalTag)}, {routine.estMinutes} min
              {swappedFrom ? `. Swapped in for ${swappedFrom} to fit today.` : null}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Link
                href={`/routines/${routine.slug}`}
                className={cn(
                  "flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-base font-black transition-opacity active:opacity-80",
                  rest
                    ? "text-(--v) ring-1 ring-(--v)/50 ring-inset"
                    : "bg-(--v) text-[oklch(0.2_0.03_258)]",
                )}
              >
                <Play className="size-4 fill-current" aria-hidden /> {rest ? "Start anyway" : "Start"}
              </Link>
              <OverrideSheet options={options} location={location} />
            </div>
          </>
        ) : (
          <>
            <p className="font-bold">No routine fits your {location} gear yet.</p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href="/settings"
                className="flex h-12 flex-1 items-center justify-center rounded-full bg-(--v) text-base font-black text-[oklch(0.2_0.03_258)]"
              >
                Add equipment
              </Link>
              <OverrideSheet options={options} location={location} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
