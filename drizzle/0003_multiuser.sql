CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"passcode" text NOT NULL,
	"weekly_goal_sessions" integer DEFAULT 3 NOT NULL,
	"home_equipment" text[] DEFAULT '{"mat"}' NOT NULL,
	"gym_equipment" text[] DEFAULT '{"mat","dumbbells","barbell","bench","squat_rack","pullup_bar","bands","kettlebell","cable","machine"}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_passcode_unique" UNIQUE("passcode")
);
--> statement-breakpoint
CREATE TABLE "household" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"household_size" integer DEFAULT 2 NOT NULL,
	"diet_style" text DEFAULT 'healthier, easy, high-protein' NOT NULL,
	"dislikes" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "metrics" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DROP INDEX "workouts_source_external_uniq";--> statement-breakpoint
DROP INDEX "metrics_date_type_source_uniq";--> statement-breakpoint
DROP INDEX "ai_insights_kind_date_uniq";--> statement-breakpoint
CREATE UNIQUE INDEX "workouts_user_source_external_uniq" ON "workouts" USING btree ("user_id","source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "metrics_user_date_type_source_uniq" ON "metrics" USING btree ("user_id","date","metric_type","source");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_insights_user_kind_date_uniq" ON "ai_insights" USING btree ("user_id","kind","date");--> statement-breakpoint
DROP TABLE "profile";
