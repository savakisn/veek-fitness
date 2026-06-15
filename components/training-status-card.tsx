import { Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TrainingStatus } from "@/lib/load";

const TONE: Record<TrainingStatus["tone"], string> = {
  good: "text-emerald-500",
  build: "text-amber-500",
  warn: "text-orange-500",
  neutral: "text-muted-foreground",
};

export function TrainingStatusCard({ status }: { status: TrainingStatus }) {
  const pct = status.target > 0 ? Math.min(100, Math.round((status.acuteWeek / status.target) * 100)) : 0;
  return (
    <div className="bg-card rounded-2xl border p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={cn("size-5", TONE[status.tone])} />
          <span className={cn("text-lg font-semibold", TONE[status.tone])}>{status.label}</span>
        </div>
        <span className="text-muted-foreground text-sm tabular-nums">
          {status.acuteWeek}/{status.target} load
        </span>
      </div>
      <Progress value={pct} className="mt-4" />
      <p className="text-muted-foreground mt-2 text-xs">{status.message}</p>
    </div>
  );
}
