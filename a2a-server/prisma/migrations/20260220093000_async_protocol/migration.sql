-- Add new columns for async protocol support
-- This migration adds fields for Message (role, contentText, promiseId, status)
-- and creates the Request table for promise-based async processing

-- Add new columns to messages table
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "content_text" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "promise_id" TEXT UNIQUE;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "status" TEXT;

-- Add title column to sessions table
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "title" TEXT DEFAULT 'New Session';

-- Create requests table for async promise handling
CREATE TABLE IF NOT EXISTS "requests" (
    "id" TEXT NOT NULL,
    "promise_id" TEXT NOT NULL UNIQUE,
    "client_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "context" JSONB NOT NULL,
    "message_text" TEXT,
    "code_blocks" JSONB,
    "result" JSONB,
    "error" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- Create indexes for requests
CREATE INDEX IF NOT EXISTS "requests_status_priority_created_at_idx" ON "requests"("status", "priority", "created_at");
CREATE INDEX IF NOT EXISTS "requests_client_id_idx" ON "requests"("client_id");
CREATE INDEX IF NOT EXISTS "requests_session_id_idx" ON "requests"("session_id");

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS "messages_promise_id_idx" ON "messages"("promise_id");

-- Add foreign key constraint for requests -> sessions
ALTER TABLE "requests" ADD CONSTRAINT "requests_session_id_fkey" 
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
