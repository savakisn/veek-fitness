import { cn } from "@/lib/utils";

export function Block({ className }: { className: string }) {
  return <div className={cn("bg-card animate-pulse rounded-2xl", className)} />;
}

// Same footprint as VerdictHero, so the page doesn't jump when it streams in.
export function HeroSkeleton() {
  return (
    <div className="bg-card rounded-[28px] px-5 pt-6 pb-4" aria-hidden>
      <div className="bg-muted h-[4.75rem] w-48 animate-pulse rounded-2xl" />
      <div className="bg-muted mt-4 h-5 w-64 animate-pulse rounded-lg" />
      <div className="border-border mt-6 border-t pt-4">
        <div className="bg-muted h-3 w-24 animate-pulse rounded" />
        <div className="bg-muted mt-2 h-6 w-52 animate-pulse rounded-lg" />
        <div className="bg-muted mt-2 h-4 w-32 animate-pulse rounded" />
        <div className="mt-4 flex gap-2">
          <div className="bg-muted h-12 flex-1 animate-pulse rounded-full" />
          <div className="h-12 w-32" />
        </div>
      </div>
    </div>
  );
}

// Full-page placeholder for route transitions (app/(today)/loading.tsx).
export function TodaySkeleton() {
  return (
    <main className="px-4" aria-busy>
      <div className="flex items-center justify-between pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <div className="bg-card h-4 w-40 animate-pulse rounded" />
        <div className="bg-card h-11 w-32 animate-pulse rounded-full" />
      </div>
      <HeroSkeleton />
      <Block className="mt-4 h-11" />
      <Block className="mt-7 h-[6.5rem]" />
      <Block className="mt-5 h-16" />
      <Block className="mt-7 h-[5.25rem]" />
    </main>
  );
}
