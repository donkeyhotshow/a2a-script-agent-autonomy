# Express app: Helmet CSP / COEP disabled

**File:** `a2a-server/src/app.ts` (~line 18)

**Problem:** `helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })` turns off CSP and COEP globally. For a JSON API the impact is smaller than for document responses, but any HTML, docs, or proxied static assets lose baseline browser protections.

**Done when:** Tighten for production (env-gated CSP), or document why both must stay off and scope `helmet()` per router.
