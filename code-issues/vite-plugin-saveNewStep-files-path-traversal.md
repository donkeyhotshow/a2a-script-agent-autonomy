# `saveNewStep`: `stepData.files` keys joined without sanitization

**File:** `a2a-client/packages/vite-plugin/storage/newSessions.js` (`saveNewStep`, ~lines 348–351)

**Problem:** `path.join(stepDir, filename)` uses `filename` from caller-controlled `stepData.files`. Keys like `../` or absolute segments can escape `stepDir` (path normalization) and write or overwrite files outside the step folder.

**Done when:** Allowlist filenames (e.g. basename only, no `..`, match `SAFE_SEGMENT`-style rules) or resolve with `path.resolve` + `safePath` containment check vs `stepDir`.
