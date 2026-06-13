CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"primary_muscles" text[] DEFAULT '{}' NOT NULL,
	"equipment" text[] DEFAULT '{"none"}' NOT NULL,
	"back_safe" boolean DEFAULT true NOT NULL,
	"cues" text,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"metric_type" text NOT NULL,
	"value" real NOT NULL,
	"unit" text,
	"source" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"weekly_goal_sessions" integer DEFAULT 3 NOT NULL,
	"home_equipment" text[] DEFAULT '{"mat"}' NOT NULL,
	"gym_equipment" text[] DEFAULT '{"mat","dumbbells","barbell","bench","squat_rack","pullup_bar","bands","kettlebell","cable","machine"}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"sets" integer,
	"reps" integer,
	"duration_seconds" integer,
	"rest_seconds" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"goal_tag" text NOT NULL,
	"est_minutes" integer DEFAULT 15 NOT NULL,
	"difficulty" text DEFAULT 'easy' NOT NULL,
	CONSTRAINT "routines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"routine_id" integer,
	"location" text,
	"type" text,
	"duration_minutes" integer,
	"perceived_effort" integer,
	"notes" text,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "metrics_date_type_source_uniq" ON "metrics" USING btree ("date","metric_type","source");--> statement-breakpoint
CREATE UNIQUE INDEX "workouts_source_external_uniq" ON "workouts" USING btree ("source","external_id");