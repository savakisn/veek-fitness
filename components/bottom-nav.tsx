"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  if (pathname === "/login") return null;

  return (
    <nav className="bg-background/90 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
