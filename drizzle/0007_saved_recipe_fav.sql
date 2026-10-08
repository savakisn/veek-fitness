ALTER TABLE "saved_recipes" ADD COLUMN IF NOT EXISTS "steps" jsonb;
--> statement-breakpoint
ALTER TABLE "saved_recipes" ADD COLUMN IF NOT EXISTS "favorite" boolean DEFAULT false NOT NULL;
