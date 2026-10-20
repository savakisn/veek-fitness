"use client";

import Link from "next/link";
import { Drawer } from "@base-ui/react/drawer";
import { ChevronRight, PencilLine } from "lucide-react";
import { CoachSuggestion } from "@/components/coach-suggestion";
import { goalLabel } from "@/lib/format";
import type { Location } from "@/lib/db/queries";

export type RoutineOption = { slug: string; name: string; estMinutes: number; goalTag: string };

// "Something else": the escape hatch from the day's call. Swap to another
// routine, ask the coach with context the watch lacks, or log what you did.
export function OverrideSheet({ options, location }: { options: RoutineOption[]; location: Location }) {
  return (
    <Drawer.Root>
      <Drawer.Trigger className="text-muted-foreground active:text-foreground h-12 shrink-0 rounded-full px-4 text-sm font-bold">
        Something else
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
          <Drawer.Popup
            initialFocus={(type) => type === "keyboard"}
            className="bg-card text-card-foreground flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-[28px] pb-[env(safe-area-inset-bottom)] outline-none [transform:translateY(var(--drawer-swipe-movement-y,0px))] transition-transform duration-300 ease-out data-[ending-style]:[transform:translateY(100%)] data-[starting-style]:[transform:translateY(100%)] data-[swiping]:duration-0 motion-reduce:transition-none"
          >
            <div aria-hidden className="bg-muted-foreground/40 mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full" />
            <Drawer.Content className="overflow-y-auto overscroll-contain px-4 pt-3 pb-6">
              <Drawer.Title className="text-title">Something else</Drawer.Title>
              <Drawer.Description className="sr-only">
                Tell the coach what&apos;s different today, or swap in another {location} routine.
              </Drawer.Description>

              <div className="mt-5">
                <CoachSuggestion location={location} />
              </div>

              <h3 className="text-eyebrow mt-7">Or pick one yourself</h3>
              {options.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {options.map((o) => (
                    <li key={o.slug}>
                      <Link
                        href={`/routines/${o.slug}`}
                        className="bg-muted/60 active:bg-muted flex min-h-14 items-center gap-3 rounded-2xl px-4 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{o.name}</p>
                          <p className="text-muted-foreground text-xs tabular-nums">
                            {goalLabel(o.goalTag)}, {o.estMinutes} min
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground mt-2 text-sm">
                  Nothing else fits your {location} gear. Add equipment in Settings to unlock more.
                </p>
              )}

              <Link
                href="/log"
                className="text-muted-foreground active:text-foreground mt-6 flex min-h-11 items-center gap-2 text-sm font-bold"
              >
                <PencilLine className="size-4" aria-hidden /> Log a workout you already did
              </Link>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
