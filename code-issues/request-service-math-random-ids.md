# Request service: `Math.random` for request / promise IDs

**File:** `a2a-server/src/services/core/request/request.service.ts` (~lines 121–122)

**Problem:** IDs use `Date.now()` + `Math.random().toString(36)` instead of `randomUUID()` — weaker uniqueness and slightly more predictable under load. Also uses deprecated `String.prototype.substr`.

**Done when:** `randomUUID()` (or crypto random bytes) with stable string prefix convention.
