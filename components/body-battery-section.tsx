import { fetchBodyBatteryToday } from "@/lib/garmin";
import { BodyBatteryChart } from "./body-battery-chart";

// Server component, streamed via <Suspense> so the page renders instantly while
// today's intraday curve is fetched from Garmin.
export async function BodyBatterySection() {
  const samples = await fetchBodyBatteryToday();
  if (samples.length < 2) {
    return (
      <div className="bg-card text-muted-foreground rounded-2xl border p-4 text-sm">
        Today&apos;s curve isn&apos;t available yet. Pull to refresh once your watch has synced.
      </div>
    );
  }
  return <BodyBatteryChart samples={samples} />;
}
