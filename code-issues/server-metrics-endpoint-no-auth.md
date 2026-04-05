# `GET /metrics`: Prometheus scrape without auth

**File:** `a2a-server/src/app.ts` (~lines 36–42)

**Problem:** `/metrics` is open to anyone who can reach the process. Labels can leak deployment details; scraping cost is unauthenticated.

**Done when:** Protect with network policy, Bearer token, or IP allowlist; document for operators.
