"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { EQUIPMENT } from "@/lib/equipment";
import { updateEquipment, updateWeeklyGoal } from "@/app/actions";
import type { Profile } from "@/lib/db/schema";

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

export function SettingsForm({ profile }: { profile: Profile }) {
  const [goal, setGoal] = useState(profile.weeklyGoalSessions);
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
        <EquipmentList location="home" owned={profile.homeEquipment} />
      </section>

      <section className="space-y-2">
        <Label>Gym equipment</Label>
        <p className="text-muted-foreground text-sm">What the gym has. Used when you switch to the Gym track.</p>
        <EquipmentList location="gym" owned={profile.gymEquipment} />
      </section>
    </div>
  );
}
