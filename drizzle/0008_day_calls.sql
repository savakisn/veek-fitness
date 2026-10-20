CREATE TABLE IF NOT EXISTS "day_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"location" text NOT NULL,
	"routine_id" integer NOT NULL REFERENCES "routines"("id"),
	"reason" text,
	"note" text,
	"inputs" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "day_calls_user_date_kind_loc_uniq" ON "day_calls" USING btree ("user_id","date","kind","location");
