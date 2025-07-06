-- Fix database schema inconsistencies
-- Add missing fields to users table

-- Add google_id field (separate from youtube_id)
ALTER TABLE "users" ADD COLUMN "google_id" text;

-- Add access_token field (separate from oauth_token)
ALTER TABLE "users" ADD COLUMN "access_token" text;

-- Add YouTube channel fields
ALTER TABLE "users" ADD COLUMN "youtube_channel_id" text;
ALTER TABLE "users" ADD COLUMN "youtube_channel_title" text;

-- Add timestamp fields
ALTER TABLE "users" ADD COLUMN "last_login" timestamp;
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now();

-- Add is_active field to titles table
ALTER TABLE "titles" ADD COLUMN "is_active" boolean DEFAULT false;

-- Add unique constraint for google_id
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");

-- Update existing records to set updated_at
UPDATE "users" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS "users_google_id_idx" ON "users"("google_id");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "titles_is_active_idx" ON "titles"("is_active");
CREATE INDEX IF NOT EXISTS "tests_user_id_idx" ON "tests"("user_id");
CREATE INDEX IF NOT EXISTS "tests_status_idx" ON "tests"("status"); 