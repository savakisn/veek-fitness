"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListPlus, Trash2, Clock, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addSavedToGrocery, deleteSavedRecipe } from "@/app/kitchen/actions";
import type { SavedRecipe } from "@/lib/db/schema";

export function MenuPanel({ recipes }: { recipes: SavedRecipe[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (recipes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Bookmark a recipe in Cook or Plan and it lands here. Re-add it to your grocery list anytime, or remove it when you&apos;re sick of it.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {recipes.map((r) => (
        <div key={r.id} className="bg-card rounded-xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium">{r.name}</h3>
            <button
              type="button"
              aria-label="Remove from Menu"
              onClick={() => start(async () => {
                await deleteSavedRecipe(r.id);
                router.refresh();
              })}
              className="text-muted-foreground hover:text-destructive p-1"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          {r.blurb && <p className="text-muted-foreground mt-0.5 text-sm">{r.blurb}</p>}
          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
            {r.proteinGrams != null && (
              <span className="flex items-center gap-1">
                <Beef className="size-3.5" /> {r.proteinGrams}g
              </span>
            )}
            {r.prepMinutes != null && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {r.prepMinutes}m
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            className="mt-3"
            onClick={() => start(async () => {
              const res = await addSavedToGrocery(r.id);
              if (res.ok) toast.success(res.added > 0 ? `Added ${res.added} to your list.` : "Already on your list.");
              else toast.error(res.error);
              router.refresh();
            })}
          >
            <ListPlus className="size-4" /> Add to list
          </Button>
        </div>
      ))}
    </div>
  );
}
