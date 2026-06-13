"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/format";
import { saveWorkout } from "@/lib/offline-queue";

const QUICK = ["Walk", "Disc golf", "Ski", "Bike", "Run", "Strength", "Yard work"];
const EFFORT = ["Easy", "Light", "Moderate", "Hard", "All out"];

export function LogForm() {
  const router = useRouter();
  const [type, setType] = useState("");
  const [date, setDate] = useState(todayISO());
  const [duration, setDuration] = useState("");
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, startSave] = useTransition();

  function save() {
    if (!type.trim()) {
      toast.error("What did you do? Add an activity.");
      return;
    }
    startSave(async () => {
      const result = await saveWorkout({
        date,
        source: "manual",
        type: type.trim(),
        durationMinutes: duration ? Number(duration) : null,
        perceivedEffort: effort,
        notes: notes.trim() || null,
      });
      toast.success(result === "queued" ? "Saved offline. Syncs when you're back online." : "Logged.");
      router.push("/");
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Activity</Label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setType(q)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                type === q ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
              )}
            >
              {q}
            </button>
          ))}
        </div>
        <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Or type your own" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dur">Minutes</Label>
          <Input id="dur" type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="30" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Effort (optional)</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {EFFORT.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setEffort(effort === i + 1 ? null : i + 1)}
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

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

      <Button className="h-12 w-full text-base" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
