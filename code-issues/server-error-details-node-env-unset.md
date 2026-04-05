# Error handler: stacks leak when `NODE_ENV` is unset

**File:** `a2a-server/src/middleware/error.middleware.ts` (`exposeErrorDetailsToClient`)

**Problem:** Returns `true` when `NODE_ENV !== 'production'`. If `NODE_ENV` is **undefined** (common misconfiguration), expression is `true` — clients get internal `message` and `stack` on 500s unless `A2A_ERROR_EXPOSE_DETAILS` is explicitly off.

**Done when:** Default safe: treat missing `NODE_ENV` as production for exposure, or require `NODE_ENV=development` to expose; document in `ENV-MATRIX`.
