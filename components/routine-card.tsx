import Link from "next/link";
import { ChevronRight, Clock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { goalLabel } from "@/lib/format";
import { equipmentLabel } from "@/lib/equipment";
import type { RoutineCard as RoutineCardType } from "@/lib/db/queries";

export function RoutineCard({ card }: { card: RoutineCardType }) {
  const inner = (
    <div className="flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{card.name}</h3>
          {card.goalTag === "sport_prep" && (
            <Badge variant="secondary" className="shrink-0">
              Sport
            </Badge>
          )}
        </div>
        {card.description && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">{card.description}</p>
        )}
        <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
          <span>{goalLabel(card.goalTag)}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {card.estMinutes} min
          </span>
          {!card.available && (
            <span className="text-amber-600 dark:text-amber-500">
              Needs {card.missing.map(equipmentLabel).join(", ")}
            </span>
          )}
        </div>
      </div>
      {card.available ? (
        <ChevronRight className="text-muted-foreground size-5 shrink-0" />
      ) : (
        <Lock className="text-muted-foreground size-4 shrink-0" />
      )}
    </div>
  );

  if (!card.available) {
    return <div className="bg-card/50 rounded-xl border opacity-70">{inner}</div>;
  }
  return (
    <Link href={`/routines/${card.slug}`} className="bg-card hover:bg-accent/40 block rounded-xl border transition-colors">
      {inner}
    </Link>
  );
}
