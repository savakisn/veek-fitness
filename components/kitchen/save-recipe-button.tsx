"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveRecipe } from "@/app/kitchen/actions";

export type SaveableRecipe = {
  name: string;
  blurb?: string | null;
  proteinGrams?: number | null;
  prepMinutes?: number | null;
  items: { item: string; quantity?: string }[];
};

export function SaveRecipeButton({ recipe }: { recipe: SaveableRecipe }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await saveRecipe(recipe);
      setSaved(true);
      toast.success("Saved to Menu.");
    });
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={pending}
      aria-label="Save to Menu"
      className={cn("p-1", saved ? "text-primary" : "text-muted-foreground hover:text-foreground")}
    >
      {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
    </button>
  );
}
