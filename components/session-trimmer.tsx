"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Scissors, RotateCcw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ReferenceArea, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { updateWorkoutTrim } from "@/app/actions";

export function SessionTrimmer({
  id,
  speedSamples,
  trim,
}: {
  id: number;
  speedSamples: { t: number; v: number }[];
  trim?: { startSec: number; endSec: number };
}) {
  const router = useRouter();
  const maxT = speedSamples[speedSamples.length - 1]?.t ?? 0;
  const [start, setStart] = useState(trim?.startSec ?? 0);
  const [end, setEnd] = useState(trim?.endSec ?? maxT);
  const [pending, startT] = useTransition();
  const data = speedSamples.map((s) => ({ t: s.t, mph: Math.round(s.v * 2.23694 * 10) / 10 }));

  function apply() {
    startT(async () => {
      await updateWorkoutTrim(id, start, Math.max(start + 60, end));
      toast.success("Session trimmed.");
      router.refresh();
    });
  }
  function reset() {
    setStart(0);
    setEnd(maxT);
    startT(async () => {
      await updateWorkoutTrim(id, 0, maxT);
      toast("Trim reset.");
      router.refresh();
    });
  }

  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Trim session</p>
      <p className="text-muted-foreground mt-0.5 mb-3 text-xs">Speed (mph) over time. Cut the drive-home spike.</p>
      <div className="h-40 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -24 }}>
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, maxT]}
              tickFormatter={(v) => `${Math.round(v / 60)}m`}
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis width={28} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            {start > 0 && <ReferenceArea x1={0} x2={start} fill="var(--destructive)" fillOpacity={0.15} />}
            {end < maxT && <ReferenceArea x1={end} x2={maxT} fill="var(--destructive)" fillOpacity={0.15} />}
            <Line type="monotone" dataKey="mph" stroke="var(--primary)" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>Start</span>
          <span>{Math.round(start / 60)} min</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxT}
          value={start}
          onChange={(e) => setStart(Math.min(Number(e.target.value), end - 60))}
          className="accent-primary w-full"
        />
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>End</span>
          <span>{Math.round(end / 60)} min</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxT}
          value={end}
          onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 60))}
          className="accent-primary w-full"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={apply} disabled={pending} size="sm">
          <Scissors className="size-4" /> Apply trim
        </Button>
        <Button onClick={reset} disabled={pending} size="sm" variant="outline">
          <RotateCcw className="size-4" /> Reset
        </Button>
      </div>
    </div>
  );
}
