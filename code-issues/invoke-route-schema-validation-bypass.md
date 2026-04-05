# Invoke route: AJV compile failure skips body validation

**File:** `a2a-server/src/routes/index.ts` (~lines 24–31, `validateInvokeRequest`)

**Problem:** If `server-invoke-request.schema.json` cannot be read or compiled, `validateInvokeRequestBody` stays `null` and `validateInvokeRequest` returns `{ valid: true }` for all bodies — no schema enforcement.

**Done when:** Fail fast in production when schema missing; or ship schema in build artifact and log fatal on compile error.
