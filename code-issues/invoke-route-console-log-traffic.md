# Invoke route: `console.log` on every `/invoke`

**File:** `a2a-server/src/routes/index.ts` (~lines 78, 128)

**Problem:** Logs `task` snippet and `promiseId` on each request via `console.log`. Bypasses structured `logger`, complicates log aggregation, and can leak sensitive task text in shared log sinks.

**Done when:** Remove or gate behind `DEBUG_INVOKE=1`; use `logger.debug` with redaction.
