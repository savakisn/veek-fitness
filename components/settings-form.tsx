"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EQUIPMENT } from "@/lib/equipment";
import { updateEquipment, updateWeeklyGoal, updateKitchenPrefs } from "@/app/actions";
import type { User, Household } from "@/lib/db/schema";

function KitchenPrefs({ household: hh }: { household: Household }) {
  const [household, setHousehold] = useState(hh.householdSize);
  const [dislikes, setDislikes] = useState(hh.dislikes.join(", "));
  const [, start] = useTransition();

  function save(nextHousehold: number, nextDislikes: string) {
    const list = nextDislikes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    start(async () => {
      await updateKitchenPrefs({ householdSize: nextHousehold, dislikes: list });
    });
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
                setHousehold(n);
                save(n, dislikes);
              }}
              className={cn(
                "rounded-lg border py-2 text-sm tabular-nums",
                household === n ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="dislikes">Foods to avoid</Label>
        <p className="text-muted-foreground mt-0.5 mb-2 text-sm">Comma separated. The meal planner skips these.</p>
        <Input
          id="dislikes"
          value={dislikes}
          onChange={(e) => setDislikes(e.target.value)}
          onBlur={() => save(household, dislikes)}
          placeholder="e.g. mushrooms, cilantro"
        />
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
