# SDK session service: raw `console.log`

**File:** `a2a-client/packages/sdk/src/server/services/session-service.ts`

**Problem:** Multiple `[SESSION] ...` `console.log` calls instead of structured logger (inconsistent with server-side logging elsewhere).

**Done when:** Inject logger or use shared util; levels for debug vs info.
