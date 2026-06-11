ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "events" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "confidence" real;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "votes" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "consensus" text;
