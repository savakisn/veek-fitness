ALTER TABLE "saved_recipes" ADD COLUMN IF NOT EXISTS "steps" jsonb;
ALTER TABLE "saved_recipes" ADD COLUMN IF NOT EXISTS "favorite" boolean DEFAULT false NOT NULL;
