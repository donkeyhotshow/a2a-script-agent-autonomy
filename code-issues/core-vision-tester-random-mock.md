# Core VisionTester: random mock pass/fail

**File:** `a2a-server/src/services/core/vision-tester.ts` (`performVisualQA`)

**Problem:** `Math.random() > 0.2` decides pass/fail — non-deterministic, not tied to screenshot or model; misleading for operators and tests.

**Done when:** Real hub call, feature flag to disable, or deterministic stub (env `VISION_MOCK_*`) documented in ENV matrix.
