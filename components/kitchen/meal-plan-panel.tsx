"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Clock, Beef, CalendarX, Plus, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMealPlan, dismissMeal, addMealToPlan, saveRecipe } from "@/app/kitchen/actions";
import { MealRating, type Sentiment } from "./meal-rating";
import { SaveRecipeButton } from "./save-recipe-button";
import { SwipeCard } from "./swipe-card";
import { cn } from "@/lib/utils";
import type { WeeklyMealPlan, PlannedMeal } from "@/lib/ai/prompts";

function searchUrl(name: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(name + " recipe")}`;
}

export function MealPlanPanel({
  plan,
  feedback,
}: {
  plan: WeeklyMealPlan | null;
  feedback: Record<string, Sentiment>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [addPending, startAdd] = useTransition();
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  function run() {
    start(async () => {
      const res = await generateMealPlan(note);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Fresh plan ready.");
      router.refresh();
    });
  }
  function recipeOf(m: PlannedMeal) {
    return {
      name: m.name,
      blurb: m.blurb,
      proteinGrams: m.proteinGrams,
      prepMinutes: m.prepMinutes,
      items: m.ingredients ?? [],
      steps: m.steps ?? null,
    };
  }
  function bookmark(m: PlannedMeal) {
    start(async () => {
      await saveRecipe(recipeOf(m));
      toast.success("Saved to Menu.");
    });
  }
  function remove(name: string) {
    start(async () => {
      await dismissMeal(name);
      toast("Removed from this week.");
      router.refresh();
    });
  }
  function add() {
    const name = adding.trim();
    if (!name) {
      toast.error("Type a meal first.");
      return;
    }
    startAdd(async () => {
      const res = await addMealToPlan(name);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAdding("");
      toast.success("Added to this week.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        A few easy, high-protein dinners. Tell it what this week is like and it keeps things simple.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="This week: e.g. we're moving, just 2-3 super easy meals"
        className="border-input bg-background w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
      />
      <Button onClick={run} disabled={pending} className="h-11 w-full">
        <Sparkles className="size-4" /> {pending ? "Cooking up a plan…" : plan ? "Regenerate plan" : "Generate this week's plan"}
      </Button>

      {plan && plan.meals?.length ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs">Swipe a meal → save · ← remove. Tap a card for the recipe.</p>
          {plan.meals.map((m, i) => (
            <SwipeCard key={i} onSwipeLeft={() => remove(m.name)} onSwipeRight={() => bookmark(m)}>
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
                      aria-label="Remove from this week"
                      onClick={() => remove(m.name)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <CalendarX className="size-4" />
                    </button>
                    <SaveRecipeButton recipe={recipeOf(m)} />
                    <MealRating name={m.name} current={feedback[m.name] ?? null} onDislike={() => remove(m.name)} />
                  </div>
                </div>
                {m.blurb && <p className="text-muted-foreground mt-0.5 text-sm">{m.blurb}</p>}

                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 text-xs font-medium"
                >
                  <ChevronDown className={cn("size-3.5 transition-transform", open === i && "rotate-180")} />
                  {open === i ? "Hide recipe" : "Show recipe"}
                </button>

                {open === i && (
                  <div className="mt-2 space-y-2">
                    {m.ingredients?.length > 0 && (
                      <ul className="text-muted-foreground space-y-0.5 text-sm">
                        {m.ingredients.map((ing, j) => (
                          <li key={j}>
                            • {ing.quantity ? `${ing.quantity} ` : ""}
                            {ing.item}
                          </li>
                        ))}
                      </ul>
                    )}
                    {m.steps?.length > 0 && (
                      <ol className="text-muted-foreground list-decimal space-y-0.5 pl-4 text-sm">
                        {m.steps.map((s, j) => (
                          <li key={j}>{s}</li>
                        ))}
                      </ol>
                    )}
                    <a
                      href={searchUrl(m.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-1 text-xs font-medium"
                    >
                      See real versions <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}
              </div>
            </SwipeCard>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No ideas yet. Generate a few and they&apos;ll feed your grocery list.</p>
      )}

      {/* Add something specific you already want to cook */}
      <div className="bg-card flex items-center gap-2 rounded-xl border p-3">
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          disabled={addPending}
          placeholder="Add something else? e.g. chicken sandwiches"
          className="w-full bg-transparent text-sm outline-none"
        />
        <Button onClick={add} disabled={addPending} size="sm" variant="outline" className="shrink-0">
          <Plus className={cn("size-4", addPending && "animate-spin")} /> {addPending ? "Adding…" : "Add"}
        </Button>
      </div>
    </div>
  );
}
