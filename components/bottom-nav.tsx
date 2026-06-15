"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Dumbbell, UtensilsCrossed, CalendarDays, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Today", icon: Home },
  { href: "/routines", label: "Routines", icon: Dumbbell },
  { href: "/kitchen", label: "Kitchen", icon: UtensilsCrossed },
  { href: "/history", label: "History", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  // Highlight the tapped tab immediately; the real route catches up a beat later.
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);

  useEffect(() => {
    ITEMS.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  // Once the route changes (tap landed, or back button), drop the optimistic highlight.
  if (pending && pending.from !== pathname) setPending(null);

  if (pathname === "/login") return null;

  const activeHref = pending?.href ?? pathname;

  return (
    <nav className="bg-background/90 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? activeHref === "/" : activeHref.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setPending({ href, from: pathname })}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors active:scale-95",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5 transition-transform" strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
