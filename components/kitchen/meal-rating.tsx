"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { rateMeal } from "@/app/kitchen/actions";

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
  const router = useRouter();
  const [pending, start] = useTransition();

  function set(s: Sentiment) {
    const next = current === s ? null : s;
    start(async () => {
      await rateMeal(name, next);
      if (next === "dislike") onDislike?.();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        aria-label="More like this"
        disabled={pending}
        onClick={() => set("like")}
        className={cn("p-1", current === "like" ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <ThumbsUp className="size-4" />
      </button>
      <button
        aria-label="Less like this"
        disabled={pending}
        onClick={() => set("dislike")}
        className={cn("p-1", current === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-foreground")}
      >
        <ThumbsDown className="size-4" />
      </button>
    </div>
  );
}
