ALTER TABLE "trips" ADD COLUMN "stop_count" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "location_preference" text DEFAULT '' NOT NULL;