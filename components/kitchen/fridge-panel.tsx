"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChefHat, Clock, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fridgeToRecipe } from "@/app/kitchen/actions";
import { MealRating, type Sentiment } from "./meal-rating";
import type { RecipeSuggestion } from "@/lib/ai/prompts";

export function FridgePanel({
  hasPantry,
  feedback,
}: {
  hasPantry: boolean;
  feedback: Record<string, Sentiment>;
}) {
  const [recipes, setRecipes] = useState<RecipeSuggestion[] | null>(null);
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await fridgeToRecipe();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setRecipes(res.recipes);
      if (res.recipes.length === 0) toast("Nothing came back — try adding a few more pantry items.");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        What can you make from what&apos;s on hand right now? Easy, high-protein ideas only.
      </p>
      <Button onClick={run} disabled={pending} className="h-11 w-full">
        <ChefHat className="size-4" /> {pending ? "Thinking…" : "What can I make?"}
      </Button>
      {!hasPantry && (
        <p className="text-muted-foreground text-xs">Tip: add items in the Pantry tab for better ideas.</p>
      )}

      <div className="space-y-3">
        {recipes?.map((r, i) => (
          <div key={i} className="bg-card rounded-xl border p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{r.name}</h3>
              <MealRating name={r.name} current={feedback[r.name] ?? null} />
            </div>
            {r.blurb && <p className="text-muted-foreground mt-0.5 text-sm">{r.blurb}</p>}
            <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Beef className="size-3.5" /> {r.proteinGrams}g protein
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {r.prepMinutes} min
              </span>
            </div>
            {r.alsoNeed?.length > 0 && (
              <p className="mt-2 text-xs">
                <span className="text-muted-foreground">Also need: </span>
                {r.alsoNeed.join(", ")}
              </p>
            )}
            {r.steps?.length > 0 && (
              <ol className="text-muted-foreground mt-2 list-decimal space-y-0.5 pl-4 text-sm">
                {r.steps.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
