"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Clock, Beef, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMealPlan, replaceMealInPlan, saveRecipe } from "@/app/kitchen/actions";
import { MealRating, type Sentiment } from "./meal-rating";
import { SaveRecipeButton } from "./save-recipe-button";
import { SwipeCard } from "./swipe-card";
import type { WeeklyMealPlan, PlannedMeal } from "@/lib/ai/prompts";

export function MealPlanPanel({
  plan,
  feedback,
}: {
  plan: WeeklyMealPlan | null;
  feedback: Record<string, Sentiment>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await generateMealPlan();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Fresh plan ready.");
      router.refresh();
    });
  }

  function recipeOf(m: PlannedMeal) {
    return { name: m.name, blurb: m.blurb, proteinGrams: m.proteinGrams, prepMinutes: m.prepMinutes, items: m.ingredients ?? [] };
  }
  function bookmark(m: PlannedMeal) {
    start(async () => {
      await saveRecipe(recipeOf(m));
      toast.success("Saved to Menu.");
    });
  }
  function dismiss(name: string) {
    start(async () => {
      await replaceMealInPlan(name);
      toast("Swapped in a fresh idea.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        A week of easy, high-protein dinners that ease you up from where you are — no kale cliff.
      </p>
      <Button onClick={run} disabled={pending} className="h-11 w-full">
        <Sparkles className="size-4" /> {pending ? "Cooking up a plan…" : plan ? "Regenerate plan" : "Generate this week's plan"}
      </Button>

      {plan ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs">Swipe a meal → save · ← not this week.</p>
          {plan.meals?.map((m, i) => (
            <SwipeCard key={i} onSwipeLeft={() => dismiss(m.name)} onSwipeRight={() => bookmark(m)}>
              <div className="bg-card rounded-xl border p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {m.kind === "new" ? "New idea" : "Staple"}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <Beef className="size-3.5" /> {m.proteinGrams}g
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" /> {m.prepMinutes}m
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex items-start justify-between gap-2">
                  <h3 className="font-medium">{m.name}</h3>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Not this week"
                      onClick={() => dismiss(m.name)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <CalendarX className="size-4" />
                    </button>
                    <SaveRecipeButton recipe={recipeOf(m)} />
                    <MealRating name={m.name} current={feedback[m.name] ?? null} onDislike={() => dismiss(m.name)} />
                  </div>
                </div>
                {m.blurb && <p className="text-muted-foreground mt-0.5 text-sm">{m.blurb}</p>}
                {m.steps?.length > 0 && (
                  <ol className="text-muted-foreground mt-2 list-decimal space-y-0.5 pl-4 text-sm">
                    {m.steps.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ol>
                )}
              </div>
            </SwipeCard>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No ideas yet. Generate a few and they&apos;ll feed your grocery list.
        </p>
      )}
    </div>
  );
}
