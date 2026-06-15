"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FridgePanel } from "./fridge-panel";
import { MealPlanPanel } from "./meal-plan-panel";
import { GroceryPanel } from "./grocery-panel";
import type { Sentiment } from "./meal-rating";
import type { PantryItem, GroceryItem } from "@/lib/db/schema";
import type { WeeklyMealPlan } from "@/lib/ai/prompts";

export function KitchenTabs({
  pantry,
  plan,
  grocery,
  feedback,
}: {
  pantry: PantryItem[];
  plan: WeeklyMealPlan | null;
  grocery: GroceryItem[];
  feedback: Record<string, Sentiment>;
}) {
  return (
    <Tabs defaultValue="cook">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="cook">Cook</TabsTrigger>
        <TabsTrigger value="plan">Plan</TabsTrigger>
        <TabsTrigger value="grocery">Grocery</TabsTrigger>
      </TabsList>
      <TabsContent value="cook" className="mt-4">
        <FridgePanel pantry={pantry} feedback={feedback} />
      </TabsContent>
      <TabsContent value="plan" className="mt-4">
        <MealPlanPanel plan={plan} feedback={feedback} />
      </TabsContent>
      <TabsContent value="grocery" className="mt-4">
        <GroceryPanel items={grocery} hasPlan={!!plan} />
      </TabsContent>
    </Tabs>
  );
}
