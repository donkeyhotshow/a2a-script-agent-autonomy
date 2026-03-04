-- One-off: create requests table (matches current schema, no session_id)
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
CREATE INDEX IF NOT EXISTS "requests_status_priority_created_at_idx" ON "requests"("status", "priority", "created_at");
CREATE INDEX IF NOT EXISTS "requests_client_id_idx" ON "requests"("client_id");
