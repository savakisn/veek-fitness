"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const OPTS = [
  { d: 7, l: "1W" },
  { d: 30, l: "1M" },
  { d: 90, l: "3M" },
  { d: 365, l: "1Y" },
];

export function RangeToggle({ current }: { current: number }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1.5">
      {OPTS.map((o) => (
        <Link
          key={o.d}
          href={`${pathname}?range=${o.d}`}
          scroll={false}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            current === o.d ? "bg-primary text-primary-foreground border-transparent" : "bg-card text-muted-foreground",
          )}
        >
          {o.l}
        </Link>
      ))}
    </div>
  );
}
