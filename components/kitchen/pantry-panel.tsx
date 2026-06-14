"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { addPantryItem, deletePantryItem } from "@/app/kitchen/actions";
import type { PantryItem } from "@/lib/db/schema";

function expiryLabel(useBy: string | null): { text: string; tone: string } | null {
  if (!useBy) return null;
  const days = differenceInCalendarDays(new Date(useBy + "T00:00:00"), new Date());
  if (days < 0) return { text: "expired", tone: "text-destructive" };
  if (days === 0) return { text: "use today", tone: "text-destructive" };
  if (days <= 3) return { text: `${days}d left`, tone: "text-amber-500" };
  return { text: `${days}d left`, tone: "text-muted-foreground" };
}

export function PantryPanel({ items }: { items: PantryItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("fridge");
  const [useBy, setUseBy] = useState("");
  const [pending, start] = useTransition();

  function add() {
    if (!name.trim()) return;
    const payload = { name, location, useBy: useBy || null };
    setName("");
    setUseBy("");
    start(async () => {
      await addPantryItem(payload);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">What&apos;s on hand. Sorted by what to use first so nothing spoils.</p>

      <div className="space-y-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item (e.g. chicken thighs)" />
        <div className="flex gap-2">
          <Select value={location} onValueChange={(v) => setLocation(v ?? "fridge")}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fridge">Fridge</SelectItem>
              <SelectItem value="freezer">Freezer</SelectItem>
              <SelectItem value="pantry">Pantry</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={useBy} onChange={(e) => setUseBy(e.target.value)} className="flex-1" aria-label="Use by" />
          <Button onClick={add} size="icon" disabled={pending}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing in the pantry yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((i) => {
            const ub = expiryLabel(i.useBy);
            return (
              <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{i.name}</p>
                  <p className="text-muted-foreground text-xs capitalize">{i.location}</p>
                </div>
                {ub && <span className={cn("text-xs", ub.tone)}>{ub.text}</span>}
                <button
                  aria-label="Remove"
                  onClick={() => start(async () => {
                    await deletePantryItem(i.id);
                    router.refresh();
                  })}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
