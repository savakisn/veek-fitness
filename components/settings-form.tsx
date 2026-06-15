"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EQUIPMENT } from "@/lib/equipment";
import { updateEquipment, updateWeeklyGoal, updateKitchenPrefs } from "@/app/actions";
import type { User, Household } from "@/lib/db/schema";

function KitchenPrefs({ household: hh }: { household: Household }) {
  const [householdSize, setHouseholdSize] = useState(hh.householdSize);
  const [dislikes, setDislikes] = useState<string[]>(hh.dislikes);
  const [draft, setDraft] = useState("");
  const [, start] = useTransition();

  function persist(size: number, list: string[]) {
    start(async () => {
      await updateKitchenPrefs({ householdSize: size, dislikes: list });
    });
  }
  function addDislike() {
    const v = draft.trim();
    setDraft("");
    if (!v || dislikes.some((d) => d.toLowerCase() === v.toLowerCase())) return;
    const next = [...dislikes, v];
    setDislikes(next);
    persist(householdSize, next);
  }
  function removeDislike(d: string) {
    const next = dislikes.filter((x) => x !== d);
    setDislikes(next);
    persist(householdSize, next);
  }

  return (
    <section className="space-y-3">
      <div>
        <Label>Cooking for</Label>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setHouseholdSize(n);
                persist(n, dislikes);
              }}
              className={cn(
                "rounded-lg border py-2 text-sm tabular-nums",
                householdSize === n ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Foods to avoid</Label>
        <p className="text-muted-foreground mt-0.5 mb-2 text-sm">Shared with the household. The meal planner skips these.</p>
        {dislikes.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {dislikes.map((d) => (
              <span key={d} className="bg-muted/50 flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm">
                {d}
                <button type="button" aria-label={`Remove ${d}`} onClick={() => removeDislike(d)} className="text-muted-foreground hover:text-destructive">
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDislike();
              }
            }}
            placeholder="Add a food to avoid"
          />
          <Button type="button" onClick={addDislike} size="icon" variant="outline">
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function EquipmentList({
  location,
  owned,
}: {
  location: "home" | "gym";
  owned: string[];
}) {
  const [items, setItems] = useState<string[]>(owned);
  const [, start] = useTransition();

  function toggle(key: string, on: boolean) {
    const next = on ? [...items, key] : items.filter((k) => k !== key);
    setItems(next);
    start(async () => {
      await updateEquipment(location, next);
    });
  }

  return (
    <div className="divide-y rounded-xl border">
      {EQUIPMENT.map((e) => (
        <div key={e.key} className="flex items-center justify-between px-4 py-3">
          <Label htmlFor={`${location}-${e.key}`} className="text-sm font-normal">
            {e.label}
          </Label>
          <Switch
            id={`${location}-${e.key}`}
            checked={items.includes(e.key)}
            onCheckedChange={(on) => toggle(e.key, on)}
          />
        </div>
      ))}
    </div>
  );
}

export function SettingsForm({ user, household }: { user: User; household: Household }) {
  const [goal, setGoal] = useState(user.weeklyGoalSessions);
  const [, start] = useTransition();

  function setWeeklyGoal(n: number) {
    setGoal(n);
    start(async () => {
      await updateWeeklyGoal(n);
      toast.success(`Weekly goal set to ${n}.`);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <Label>Weekly goal</Label>
        <p className="text-muted-foreground text-sm">Sessions per week to keep the streak alive.</p>
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setWeeklyGoal(n)}
              className={cn(
                "rounded-lg border py-2 text-sm tabular-nums",
                goal === n ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <Label>Home equipment</Label>
        <p className="text-muted-foreground text-sm">What you have at home. Routines unlock as you add gear.</p>
        <EquipmentList location="home" owned={user.homeEquipment} />
      </section>

      <section className="space-y-2">
        <Label>Gym equipment</Label>
        <p className="text-muted-foreground text-sm">What the gym has. Used when you switch to the Gym track.</p>
        <EquipmentList location="gym" owned={user.gymEquipment} />
      </section>

      <div>
        <Label className="text-base">Kitchen</Label>
        <p className="text-muted-foreground mt-0.5 text-sm">Shared with the household.</p>
        <div className="mt-3">
          <KitchenPrefs household={household} />
        </div>
      </div>
    </div>
  );
}
