# Task 05: Tests and Rollout Gates

## Atomic update action
Run targeted unit/integration checks for projection modules, step routes, and session hydration before rollout.

## Reason
Refactor touches protocol boundaries; tests must prove compatibility and no async/session regressions.

## Affected files
- `a2a-client/tests/unit/vite-plugin-storage.test.js`
- `a2a-client/tests/unit/web-execute-dto.test.mjs`
- `a2a-client/vite-plugin-a2a/routes/*`
- `a2a-client/web/js/*` (session path)

## Validation checklist
- Run projection-related unit tests.
- Run session-storage and route integration tests.
- Run simulation lint/validate for changed contract docs/fixtures.
