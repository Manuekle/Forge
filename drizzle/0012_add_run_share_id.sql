ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "share_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "runs_share_id_unique" ON "runs" ("share_id");
