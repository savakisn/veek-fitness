import "server-only";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

// Both backends speak the same Drizzle query API, so the rest of the app is backend-agnostic.
// Dev (no DATABASE_URL): in-process PGlite, auto-migrated and seeded so there's nothing to set up.
// Prod (DATABASE_URL set): Supabase Postgres, migrated and seeded explicitly via npm scripts.
const globalForDb = globalThis as unknown as { _db?: Promise<DB> };

async function initLocal(): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { seedDatabase } = await import("./seed-data");

  const client = new PGlite("./.pglite");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  await seedDatabase(db as unknown as DB);
  return db as unknown as DB;
}

async function initRemote(url: string): Promise<DB> {
  const postgres = (await import("postgres")).default;
  const client = postgres(url, { prepare: false });
  return drizzlePg(client, { schema });
}

export function getDb(): Promise<DB> {
  if (!globalForDb._db) {
    const url = process.env.DATABASE_URL;
    globalForDb._db = url ? initRemote(url) : initLocal();
  }
  return globalForDb._db;
}
