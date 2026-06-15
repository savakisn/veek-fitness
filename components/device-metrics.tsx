import { Footprints, Moon, Heart, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Shows the latest numbers synced from a device (Garmin). Renders nothing if
// there's no data, so users without a connected device don't see an empty card.
export function DeviceMetrics({ metrics }: { metrics: Record<string, number> }) {
  const items: { label: string; value: string; icon: LucideIcon }[] = [];
  if (metrics.steps) items.push({ label: "Steps", value: Math.round(metrics.steps).toLocaleString(), icon: Footprints });
  if (metrics.sleep_hours) items.push({ label: "Sleep", value: `${metrics.sleep_hours}h`, icon: Moon });
  if (metrics.sleep_score) items.push({ label: "Sleep score", value: String(Math.round(metrics.sleep_score)), icon: Star });
  if (metrics.resting_hr) items.push({ label: "Resting HR", value: String(Math.round(metrics.resting_hr)), icon: Heart });
  if (items.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">From your Garmin</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="flex items-center gap-2">
              <Icon className="text-primary size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium tabular-nums">{it.value}</p>
                <p className="text-muted-foreground text-xs">{it.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
