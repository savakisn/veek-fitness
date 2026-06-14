import { getPantry, getCurrentMealPlan, getGrocery } from "@/lib/db/kitchen";
import { PageHeader } from "@/components/page-header";
import { KitchenTabs } from "@/components/kitchen/kitchen-tabs";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const [pantry, plan, grocery] = await Promise.all([
    getPantry(),
    getCurrentMealPlan(),
    getGrocery(),
  ]);

  return (
    <main>
      <PageHeader title="Kitchen" subtitle="Eat better without the gut shock" />
      <div className="px-4">
        <KitchenTabs pantry={pantry} plan={plan} grocery={grocery} />
      </div>
    </main>
  );
}
