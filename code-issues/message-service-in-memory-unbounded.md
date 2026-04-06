# `messageService`: in-memory `Map` with no cap or eviction

**File:** `a2a-server/src/services/core/messaging/message.service.ts`

**Problem:** All records live in a module-level `Map` forever. Comment says tests/dev, but if wired in a long-running process, memory grows with traffic; IDs use `Date.now()` + random slice (weak vs `randomUUID`).

**Done when:** Confirm no production mount; or add TTL/LRU, disk backing, and bounded retention.
