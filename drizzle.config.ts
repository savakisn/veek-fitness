import type { Config } from "drizzle-kit";

// One schema, Postgres dialect. Same migrations run on local PGlite and Supabase.
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
} satisfies Config;
