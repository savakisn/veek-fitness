CREATE TABLE "garmin_auth" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"oauth1" jsonb,
	"oauth2" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
