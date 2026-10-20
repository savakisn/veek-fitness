"use client";

import { logWorkout, type LogWorkoutInput } from "@/app/actions";
import { setBackStatus } from "@/app/log/actions";

// Log-and-sync, app-layer. If a save fails because there's no signal, it's stashed
// in localStorage and replayed when the connection comes back. Single user, so
// replaying in order with no conflict handling is all that's needed.
const KEY = "vf_pending_workouts";
const BACK_KEY = "vf_pending_back";

type PendingBack = { date: string; status: number };

function readKey<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function writeKey<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

const read = () => readKey<LogWorkoutInput>(KEY);
const write = (items: LogWorkoutInput[]) => writeKey(KEY, items);

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

// Same idea for the self-reported back status that rides along with a log.
export async function saveBackStatus(date: string, status: number): Promise<"saved" | "queued"> {
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
    await setBackStatus(date, status);
    return "saved";
  } catch {
    writeKey<PendingBack>(BACK_KEY, [...readKey<PendingBack>(BACK_KEY), { date, status }]);
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
  let back = readKey<PendingBack>(BACK_KEY);
  for (const item of [...back]) {
    try {
      await setBackStatus(item.date, item.status);
      back = back.slice(1);
      writeKey(BACK_KEY, back);
    } catch {
      break;
    }
  }
  return flushed;
}
