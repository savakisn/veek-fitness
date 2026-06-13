import { getLocation } from "@/lib/location";
import { getRoutineCards } from "@/lib/db/queries";
import { PageHeader } from "@/components/page-header";
import { LocationToggle } from "@/components/location-toggle";
import { RoutineCard } from "@/components/routine-card";

export default async function RoutinesPage() {
  const location = await getLocation();
  const cards = await getRoutineCards(location);
  const available = cards.filter((c) => c.available);
  const locked = cards.filter((c) => !c.available);

  return (
    <main>
      <PageHeader title="Routines" action={<LocationToggle value={location} />} />

      <div className="space-y-3 px-4">
        {available.map((c) => (
          <RoutineCard key={c.id} card={c} />
        ))}

        {locked.length > 0 && (
          <>
            <p className="text-muted-foreground px-1 pt-4 pb-1 text-xs font-medium uppercase tracking-wide">
              Unlock with more equipment
            </p>
            {locked.map((c) => (
              <RoutineCard key={c.id} card={c} />
            ))}
          </>
        )}
      </div>
    </main>
  );
}
