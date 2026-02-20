-- Add session_id to requests (was missing in async_protocol migration)
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "session_id" TEXT;
