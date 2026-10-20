"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
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

// The weekly read, kept below the fold: context for the day, not the answer.
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
    <section aria-labelledby="recap-title">
      <div className="flex items-center justify-between">
        <h2 id="recap-title" className="text-eyebrow">
          Coach&apos;s read on your week
        </h2>
        <button
          onClick={refresh}
          disabled={pending}
          aria-label="Refresh weekly recap"
          className="text-muted-foreground active:text-foreground -mr-2 flex size-11 items-center justify-center"
        >
          <RefreshCw className={cn("size-4", pending && "animate-spin")} />
        </button>
      </div>

      {pending ? (
        <p className="text-muted-foreground text-sm">Reading your week…</p>
      ) : recap ? (
        <div>
          <p className="text-sm leading-snug font-bold">{recap.tldr}</p>
          {recap.details.length > 0 && (
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-sm marker:text-(--muted-foreground)">
              {recap.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Tap refresh for a read on how your week is going.</p>
      )}
    </section>
  );
}
