// Morning step: seeds the exercise + routine library into Supabase. Safe to re-run (no-op if seeded).
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { seedDatabase } from "./seed-data";
import type { DB } from "./index";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (put your Supabase connection string in .env).");

const client = postgres(url, { max: 1 });
await seedDatabase(drizzle(client) as unknown as DB);
await client.end();
console.log("Seed complete.");
