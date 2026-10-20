"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestWorkout } from "@/app/actions";
import type { Location } from "@/lib/db/queries";

// Optional: the watch already set the day's call, so this is only for what it
// can't know (short on time, a sore knee, wanting a run).
export function CoachSuggestion({ location }: { location: Location }) {
  const [feeling, setFeeling] = useState("");
  const [pick, setPick] = useState<{ slug: string; name: string; reason: string } | null>(null);
  const [pending, start] = useTransition();

  function ask() {
    start(async () => {
      const res = await suggestWorkout({ location, feeling });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPick({ slug: res.slug, name: res.name, reason: res.reason });
    });
  }

  return (
    <div>
      <label htmlFor="coach-note" className="text-eyebrow">
        Tell the coach
      </label>
      <p className="text-muted-foreground mt-0.5 text-sm">Anything the watch doesn&apos;t know. It picks a {location} routine.</p>
      <div className="mt-2.5 flex gap-2">
        <Input
          id="coach-note"
          value={feeling}
          onChange={(e) => setFeeling(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="e.g. only 20 minutes, knee feels off"
          className="h-11 flex-1 text-base"
        />
        <Button onClick={ask} disabled={pending} variant="secondary" className="h-11 px-4 font-bold">
          {pending ? "Asking…" : "Ask"}
        </Button>
      </div>
      {pick && (
        <Link
          href={`/routines/${pick.slug}`}
          className="bg-muted active:bg-accent mt-3 flex min-h-14 items-center justify-between gap-2 rounded-2xl px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-bold">{pick.name}</p>
            {pick.reason && <p className="text-muted-foreground text-sm">{pick.reason}</p>}
          </div>
          <ChevronRight className="text-muted-foreground size-5 shrink-0" />
        </Link>
      )}
    </div>
  );
}
