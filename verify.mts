import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { workouts } from "./lib/db/schema";
import { computeStreak } from "./lib/streaks";

const db = drizzle(new PGlite("./.pglite"));
const today = new Date().toISOString().slice(0, 10);
await db.insert(workouts).values({ date: today, source: "routine", routineId: 1, location: "home", type: "Morning Mobility", durationMinutes: 12, perceivedEffort: 3 });
const rows = await db.select({ date: workouts.date }).from(workouts);
console.log("WORKOUTS_NOW=" + rows.length);
console.log("STREAK=" + JSON.stringify(computeStreak(rows.map((r) => r.date), 3)));
