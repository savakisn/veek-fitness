CREATE TABLE "saved_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"blurb" text,
	"protein_grams" integer,
	"prep_minutes" integer,
	"items" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "saved_recipes_name_uniq" ON "saved_recipes" USING btree ("name");
