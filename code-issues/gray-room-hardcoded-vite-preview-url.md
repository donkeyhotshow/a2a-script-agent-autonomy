# Gray room orchestrator: hardcoded `http://localhost:5173` for vision capture

**File:** `a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts` (~line 423)

**Problem:** UI-change branch always uses `devUrl = 'http://localhost:5173'` for `globalVisionTester.captureScreenshot`. Wrong host/port in SDK-only deploy, Docker, or custom Client API origin; screenshots target the wrong app.

**Done when:** Env var (e.g. `A2A_PREVIEW_URL` / `CLIENT_PUBLIC_URL`) with safe default and docs in `ENV-MATRIX`.
