ALTER TABLE "trips" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_share_token_unique" UNIQUE("share_token");