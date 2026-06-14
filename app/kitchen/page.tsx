import { getPantry, getCurrentMealPlan, getGrocery, getMealFeedback } from "@/lib/db/kitchen";
import { PageHeader } from "@/components/page-header";
import { KitchenTabs } from "@/components/kitchen/kitchen-tabs";
import type { Sentiment } from "@/components/kitchen/meal-rating";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const [pantry, plan, grocery, feedbackRows] = await Promise.all([
    getPantry(),
    getCurrentMealPlan(),
    getGrocery(),
    getMealFeedback(),
  ]);

  const feedback: Record<string, Sentiment> = {};
  for (const r of feedbackRows) feedback[r.name] = r.sentiment as Sentiment;

  return (
    <main>
      <PageHeader title="Kitchen" subtitle="Eat better without the gut shock" />
      <div className="px-4">
        <KitchenTabs pantry={pantry} plan={plan} grocery={grocery} feedback={feedback} />
      </div>
    </main>
  );
}
