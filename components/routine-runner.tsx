"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { goalLabel, prescription, todayISO } from "@/lib/format";
import { saveWorkout } from "@/lib/offline-queue";
import type { RoutineDetail, Location } from "@/lib/db/queries";

type Phase = "overview" | "running" | "finish";
const EFFORT = ["Easy", "Light", "Moderate", "Hard", "All out"];

export function RoutineRunner({ detail, location }: { detail: RoutineDetail; location: Location }) {
  const router = useRouter();
  const { routine, items } = detail;
  const [phase, setPhase] = useState<Phase>("overview");
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, startSave] = useTransition();

  function start() {
    setStartedAt(Date.now());
    setIndex(0);
    setPhase("running");
  }

  function next() {
    if (index + 1 < items.length) setIndex(index + 1);
    else setPhase("finish");
  }

  function save() {
    const minutes = startedAt
      ? Math.max(1, Math.round((Date.now() - startedAt) / 60000))
      : routine.estMinutes;
    startSave(async () => {
      const result = await saveWorkout({
        date: todayISO(),
        source: "routine",
        routineId: routine.id,
        location: location,
        type: routine.name,
        durationMinutes: minutes,
        perceivedEffort: effort,
        notes: notes.trim() || null,
      });
      toast.success(result === "queued" ? "Saved offline. Syncs when you're back online." : "Logged. Nice work.");
      router.push("/");
    });
  }

  if (phase === "overview") {
    return (
      <main className="px-4">
        <div className="pt-6">
          <Link href="/routines" className="text-muted-foreground inline-flex items-center text-sm">
            <ArrowLeft className="mr-1 size-4" /> Routines
          </Link>
        </div>
        <div className="pt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{routine.name}</h1>
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
            <span>{goalLabel(routine.goalTag)}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {routine.estMinutes} min
            </span>
            <span className="capitalize">{routine.difficulty}</span>
          </div>
          {routine.description && (
            <p className="text-muted-foreground mt-3 text-sm">{routine.description}</p>
          )}
        </div>

        <ol className="mt-5 space-y-2">
          {items.map((it, i) => (
            <li key={it.id} className="bg-card flex items-center gap-3 rounded-xl border p-3">
              <span className="text-muted-foreground w-5 text-sm tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{it.exercise.name}</p>
                {it.exercise.cues && (
                  <p className="text-muted-foreground line-clamp-1 text-xs">{it.exercise.cues}</p>
                )}
              </div>
              <span className="text-sm tabular-nums">{prescription(it)}</span>
            </li>
          ))}
        </ol>

        <div className="bg-background/90 sticky bottom-20 mt-5 backdrop-blur">
          <Button className="h-12 w-full text-base" onClick={start}>
            Start
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "running") {
    const it = items[index];
    return (
      <main className="flex min-h-dvh flex-col px-4 pb-24">
        <div className="text-muted-foreground flex items-center justify-between pt-6 text-sm">
          <button onClick={() => setPhase("overview")} className="inline-flex items-center">
            <ArrowLeft className="mr-1 size-4" /> Back
          </button>
          <span className="tabular-nums">
            {index + 1} / {items.length}
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Badge variant="secondary" className="mb-4">
            {prescription(it)}
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight">{it.exercise.name}</h2>
          {it.exercise.cues && (
            <p className="text-muted-foreground mt-3 max-w-xs text-sm">{it.exercise.cues}</p>
          )}
        </div>

        <div className="bg-background/90 fixed inset-x-0 bottom-20 mx-auto max-w-md space-y-2 px-4 backdrop-blur">
          <Button className="h-12 w-full text-base" onClick={next}>
            <Check className="size-5" /> Done
          </Button>
          <button onClick={next} className="text-muted-foreground w-full pb-1 text-center text-sm">
            Skip
          </button>
        </div>
      </main>
    );
  }

  // finish
  return (
    <main className="px-4">
      <div className="pt-10 text-center">
        <div className="bg-primary/10 mx-auto flex size-16 items-center justify-center rounded-full">
          <Check className="text-primary size-8" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{routine.name} done</h1>
        <p className="text-muted-foreground mt-1 text-sm">Log it and keep the streak going.</p>
      </div>

      <div className="mt-8 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium">How did it feel?</p>
          <div className="grid grid-cols-5 gap-1.5">
            {EFFORT.map((label, i) => (
              <button
                key={label}
                onClick={() => setEffort(i + 1)}
                className={cn(
                  "rounded-lg border py-2 text-xs",
                  effort === i + 1 ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Notes (optional)</p>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How it went, anything to remember…" rows={3} />
        </div>

        <Button className="h-12 w-full text-base" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save workout"}
        </Button>
      </div>
    </main>
  );
}
