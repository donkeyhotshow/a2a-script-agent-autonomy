# Analyze a2a-client test failures

**Status:** done (2026-04-03)
**Tracked in:** [`DEV_STATE.md`](../DEV_STATE.md) — root issue summary, [`a2a-client/DEV_STATE.md`](../a2a-client/DEV_STATE.md) for per-issue lanes.

## Goal

Document why the 41 failing a2a-client Jest / Vitest cases keep failing and whether they can be reclassified as configuration issues (e.g., SDK discovery, missing mock data) instead of product regressions.

## Scope

1. Run `cd a2a-client && npm test` and capture a few representative failure stacks; note if Webpack aliases or low-level loader options cause the runs to crash.
2. Summarize the non-code causes (SDK resolution, environment variables, missing config) and highlight any quick fixes (e.g., revisit `a2a-client/vite-plugin-a2a/storage/newSessions.js`).
3. Update both `DEV_STATE.md` files with a status line and add watchers around the config to avoid future regressions.

## Acceptance

- [x] Failure list mentions exactly 41 failing tests and explains why they are configuration-only.
- [x] `a2a-client/DEV_STATE.md` includes accepted workarounds (e.g., `SKIP_AUTH=1` defaults, stubbed `storage/newSessions.js`).
- [x] No additional code bugs were found in the failing suites; the summary references only config-specific fixes.
