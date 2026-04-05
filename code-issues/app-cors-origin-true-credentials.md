# Express app: `cors({ origin: true, credentials: true })`

**File:** `a2a-server/src/app.ts` (~line 19)

**Problem:** Reflects any `Origin` header while allowing credentials — typical for permissive dev, risky on an internet-exposed instance (CSRF / token abuse surface depends on cookie auth and browser clients).

**Done when:** Allowlist origins via env in production; keep `origin: true` only when `NODE_ENV !== 'production'` or explicit `CORS_PERMISSIVE=1`.
