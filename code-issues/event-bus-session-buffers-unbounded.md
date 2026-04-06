# `EventBus`: per-session buffers map never evicts keys

**File:** `a2a-server/src/services/core/event-bus.ts`

**Problem:** Each `session_id` gets a `CircularBuffer` (500 events), but `buffers` is a `Map` with no TTL or max sessions. A client that publishes or subscribes under many distinct `session_id` strings can grow process memory without bound.

**Done when:** Evict buffers for sessions idle > N minutes; cap map size; tie session IDs to validated server session ids only.
