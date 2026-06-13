"use client";

import { logWorkout, type LogWorkoutInput } from "@/app/actions";

// Log-and-sync, app-layer. If a save fails because there's no signal, it's stashed
// in localStorage and replayed when the connection comes back. Single user, so
// replaying in order with no conflict handling is all that's needed.
const KEY = "vf_pending_workouts";

function read(): LogWorkoutInput[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: LogWorkoutInput[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export async function saveWorkout(input: LogWorkoutInput): Promise<"saved" | "queued"> {
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
    await logWorkout(input);
    return "saved";
  } catch {
    write([...read(), input]);
    return "queued";
  }
}

export async function flushQueue(): Promise<number> {
  let items = read();
  let flushed = 0;
  for (const item of [...items]) {
    try {
      await logWorkout(item);
      flushed++;
      items = items.slice(1);
      write(items);
    } catch {
      break;
    }
  }
  return flushed;
}
