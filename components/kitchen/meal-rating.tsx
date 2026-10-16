"use client";

import { useOptimistic, useTransition } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { rateMeal } from "@/app/kitchen/actions";
import { saveOrWarn } from "@/lib/save-or-warn";

export type Sentiment = "like" | "dislike";

export function MealRating({
  name,
  current,
  onDislike,
}: {
  name: string;
  current: Sentiment | null;
  onDislike?: () => void;
}) {
  const [pending, start] = useTransition();
  const [shown, show] = useOptimistic(current);

  function set(s: Sentiment) {
    const next = shown === s ? null : s;
    start(async () => {
      show(next);
      const saved = await saveOrWarn(rateMeal(name, next));
      if (saved && next === "dislike") onDislike?.();
    });
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        aria-label="More like this"
        aria-pressed={shown === "like"}
        disabled={pending}
        onClick={() => set("like")}
        className={cn("p-2", shown === "like" ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <ThumbsUp className="size-4" />
      </button>
      <button
        aria-label="Less like this"
        aria-pressed={shown === "dislike"}
        disabled={pending}
        onClick={() => set("dislike")}
        className={cn("p-2", shown === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-foreground")}
      >
        <ThumbsDown className="size-4" />
      </button>
    </div>
  );
}
