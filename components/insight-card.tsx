"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { refreshFitnessInsight } from "@/app/actions";

export function InsightCard({ initialText }: { initialText: string | null }) {
  const [text, setText] = useState(initialText);
  const [pending, start] = useTransition();

  function refresh() {
    start(async () => {
      const res = await refreshFitnessInsight();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setText(res.text);
    });
  }

  return (
    <div className="bg-card rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="text-primary size-4" /> Coach
        </div>
        <button
          onClick={refresh}
          disabled={pending}
          aria-label="Refresh insight"
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn("size-4", pending && "animate-spin")} />
        </button>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">
        {pending ? "Reading your week…" : (text ?? "Tap refresh for an AI read on how your week's going.")}
      </p>
    </div>
  );
}
