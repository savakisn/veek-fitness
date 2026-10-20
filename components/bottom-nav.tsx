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
    <nav className="bg-background/85 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? activeHref === "/" : activeHref.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setPending({ href, from: pathname })}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[11px] transition-colors",
                active ? "text-foreground font-bold" : "text-muted-foreground",
              )}
            >
              {/* The active tab gets a pill behind its icon, not just a colour change. */}
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  active && "bg-primary/15 text-primary",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
