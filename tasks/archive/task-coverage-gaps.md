# Task: Address test coverage gaps from excluded test files

## Status: pending

## Violation
11 test files are excluded from vitest.config.ts, representing stale tests for removed subsystems:
- neurons-v2/** - tests for removed neurons subsystem
- rag-entity-integration.test.ts - excluded RAG tests
- auto-ai-index.test.ts - excluded auto-ai functionality
- llm-client.service.test.ts - stale service tests
- auth.middleware.test.ts - auth tests disabled
- definitions-load.test.ts - definition loading tests excluded

These exclusions create gaps in test coverage and may hide regressions when functionality is restored or similar features are implemented.

## Definition of done
- [x] Review each excluded test file to determine if it should be:
  - Restored (if functionality still exists or is being restored)
  - Updated (if functionality has changed)
  - Removed permanently (if functionality is truly obsolete)
- [x] For tests to be restored: fix them to pass and remove from exclusion list
- [x] For tests to be updated: modify to match current functionality and remove from exclusion list
- [x] For tests to be removed: permanently delete them and update documentation if needed
- [x] Ensure vitest.config.ts no longer excludes these test patterns
- [x] Run full test suite to verify no regressions introduced

## Verification
- [x] vitest.config.ts contains no exclusions for the previously excluded test patterns
- [x] npm run test in a2a-server passes with all tests
- [x] No new test failures introduced from restoring/updating tests