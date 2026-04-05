# Agent registry v2: unbounded distinct `agentId`s

**File:** `a2a-server/src/services/registry-v2.ts`

**Problem:** `agents` is a `Map` with no maximum size. Unauthenticated `POST /api/registry/register` (see registry ticket) lets a client register unlimited unique `agentId` values → memory growth and degraded routing scans.

**Done when:** Cap total agents, rate-limit register, or require auth; LRU/evict offline oldest when over cap.
