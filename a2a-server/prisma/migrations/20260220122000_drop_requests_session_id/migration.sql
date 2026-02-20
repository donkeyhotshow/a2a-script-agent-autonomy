-- Drop session_id from requests
ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_session_id_fkey";
DROP INDEX IF EXISTS "requests_session_id_idx";
ALTER TABLE "requests" DROP COLUMN IF EXISTS "session_id";
