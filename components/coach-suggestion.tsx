"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestWorkout } from "@/app/actions";
import type { Location } from "@/lib/db/queries";

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
    <div className="bg-card rounded-2xl border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="text-primary size-4" /> Ask the coach
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        Tell it how you feel and it picks a {location} workout for you.
      </p>
      <Input
        value={feeling}
        onChange={(e) => setFeeling(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ask()}
        placeholder="e.g. low energy, tight back, feeling good"
        className="mt-3"
      />
      <Button onClick={ask} disabled={pending} className="mt-2 w-full">
        <Sparkles className="size-4" /> {pending ? "Thinking…" : "Suggest a workout"}
      </Button>
      {pick && (
        <Link
          href={`/routines/${pick.slug}`}
          className="bg-background hover:bg-accent/40 mt-3 flex items-center justify-between gap-2 rounded-xl border p-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{pick.name}</p>
            {pick.reason && <p className="text-muted-foreground text-xs">{pick.reason}</p>}
          </div>
          <ArrowRight className="text-muted-foreground size-4 shrink-0" />
        </Link>
      )}
    </div>
  );
}
