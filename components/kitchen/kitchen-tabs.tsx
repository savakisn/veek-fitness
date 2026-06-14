"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FridgePanel } from "./fridge-panel";
import { MealPlanPanel } from "./meal-plan-panel";
import { GroceryPanel } from "./grocery-panel";
import { PantryPanel } from "./pantry-panel";
import type { PantryItem, GroceryItem } from "@/lib/db/schema";
import type { WeeklyMealPlan } from "@/lib/ai/prompts";

export function KitchenTabs({
  pantry,
  plan,
  grocery,
}: {
  pantry: PantryItem[];
  plan: WeeklyMealPlan | null;
  grocery: GroceryItem[];
}) {
  return (
    <Tabs defaultValue="cook">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="cook">Cook</TabsTrigger>
        <TabsTrigger value="plan">Plan</TabsTrigger>
        <TabsTrigger value="grocery">Grocery</TabsTrigger>
        <TabsTrigger value="pantry">Pantry</TabsTrigger>
      </TabsList>
      <TabsContent value="cook" className="mt-4">
        <FridgePanel hasPantry={pantry.length > 0} />
      </TabsContent>
      <TabsContent value="plan" className="mt-4">
        <MealPlanPanel plan={plan} />
      </TabsContent>
      <TabsContent value="grocery" className="mt-4">
        <GroceryPanel items={grocery} hasPlan={!!plan} />
      </TabsContent>
      <TabsContent value="pantry" className="mt-4">
        <PantryPanel items={pantry} />
      </TabsContent>
    </Tabs>
  );
}
