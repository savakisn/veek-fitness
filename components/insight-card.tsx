"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { refreshFitnessInsight } from "@/app/actions";
import type { WeeklyRecap } from "@/lib/ai/prompts";

// Stored insight text is JSON ({tldr, details}); older rows were plain strings.
function parse(text: string | null): WeeklyRecap | null {
  if (!text) return null;
  try {
    const r = JSON.parse(text);
    if (r && typeof r.tldr === "string") return { tldr: r.tldr, details: Array.isArray(r.details) ? r.details : [] };
  } catch {
    return { tldr: text, details: [] };
  }
  return null;
}

export function InsightCard({ initialText }: { initialText: string | null }) {
  const [recap, setRecap] = useState<WeeklyRecap | null>(() => parse(initialText));
  const [pending, start] = useTransition();

  function refresh() {
    start(async () => {
      const res = await refreshFitnessInsight();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setRecap(res.recap);
    });
  }

  return (
    <div className="bg-card rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="text-primary size-4" /> Your week
        </div>
        <button
          onClick={refresh}
          disabled={pending}
          aria-label="Refresh weekly recap"
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn("size-4", pending && "animate-spin")} />
        </button>
      </div>

      {pending ? (
        <p className="text-muted-foreground mt-2 text-sm">Reading your week…</p>
      ) : recap ? (
        <div className="mt-2">
          <p className="text-sm font-semibold leading-snug">{recap.tldr}</p>
          {recap.details.length > 0 && (
            <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
              {recap.details.map((d, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">·</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground mt-2 text-sm">Tap refresh for a read on how your week is going.</p>
      )}
    </div>
  );
}
