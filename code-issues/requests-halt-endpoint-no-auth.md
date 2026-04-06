# `POST /api/v1/requests/:promiseId/halt`: no authentication

**File:** `a2a-server/src/routes/requests.routes.ts` (~lines 182–194)

**Problem:** Any client who can reach the server can call halt with a guessed or leaked `promiseId`, cancelling work. There is no shared secret or session binding on this mutation (same exposure class as unauthenticated poll/result if IDs are predictable).

**Done when:** Align with invoke auth / JWT; or require internal header; rate-limit halts per IP.
