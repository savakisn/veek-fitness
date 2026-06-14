CREATE TABLE "meal_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sentiment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "meal_feedback_name_uniq" ON "meal_feedback" USING btree ("name");