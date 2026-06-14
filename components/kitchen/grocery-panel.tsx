"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListPlus, Share2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  buildGroceryFromPlan,
  toggleGrocery,
  addGroceryItem,
  clearGrocery,
} from "@/app/kitchen/actions";
import type { GroceryItem } from "@/lib/db/schema";

export function GroceryPanel({ items, hasPlan }: { items: GroceryItem[]; hasPlan: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState("");
  const [pending, start] = useTransition();

  function build() {
    start(async () => {
      const res = await buildGroceryFromPlan();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.count} items added from your plan.`);
      router.refresh();
    });
  }

  function add() {
    const name = adding.trim();
    if (!name) return;
    setAdding("");
    start(async () => {
      await addGroceryItem(name);
      router.refresh();
    });
  }

  async function share() {
    const text = items.map((i) => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join("\n");
    const payload = `Grocery list\n${text}`;
    try {
      if (navigator.share) await navigator.share({ title: "Grocery list", text: payload });
      else {
        await navigator.clipboard.writeText(payload);
        toast.success("Copied to clipboard.");
      }
    } catch {
      /* user dismissed share sheet */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={build} disabled={pending} variant="outline" className="flex-1">
          <ListPlus className="size-4" /> Build from plan
        </Button>
        <Button onClick={share} disabled={items.length === 0} variant="outline">
          <Share2 className="size-4" /> Share
        </Button>
      </div>
      {!hasPlan && <p className="text-muted-foreground text-xs">Generate a meal plan first, then build the list from it.</p>}

      <div className="flex gap-2">
        <Input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add an item" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} size="icon" variant="outline">
          <Plus className="size-4" />
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Your list is empty.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                checked={i.checked}
                onChange={(e) => start(async () => {
                  await toggleGrocery(i.id, e.target.checked);
                  router.refresh();
                })}
                className="accent-primary size-4"
              />
              <span className={cn("flex-1 text-sm", i.checked && "text-muted-foreground line-through")}>
                {i.name}
                {i.quantity ? <span className="text-muted-foreground"> · {i.quantity}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <button
          onClick={() => start(async () => {
            await clearGrocery();
            router.refresh();
          })}
          className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-xs"
        >
          <Trash2 className="size-3.5" /> Clear list
        </button>
      )}
    </div>
  );
}
