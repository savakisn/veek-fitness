CREATE TABLE "ai_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"date" date NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"quantity" text,
	"checked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"plan" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"location" text DEFAULT 'fridge' NOT NULL,
	"quantity" text,
	"use_by" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "household_size" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "diet_style" text DEFAULT 'healthier, easy, high-protein' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "dislikes" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_insights_kind_date_uniq" ON "ai_insights" USING btree ("kind","date");