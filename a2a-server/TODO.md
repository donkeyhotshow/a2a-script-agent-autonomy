# Module Migration TODO

Status: ✅ Completed Structural Migration

## Phase 1: Core Engine Restructure (Priority: High - Flatten orchestration)

- [x] Create src/core/, src/core/transform/, src/core/orchestrator/
- [x] Move src/transform/\* → src/core/transform/
- [x] Move src/services/core/\* → src/core/
- [x] Move prompts/flow-control-hints.ts → src/core/transform/
- [x] Fix imports in all moved core files
- [ ] Update imports in dependent files (app.ts, index.ts, tests/)
- [ ] Test: npm run build && vitest run tests/gray-room\*.test.ts
- [ ] Update docs/\* with new paths

## Phase 2: Services Layer

- [x] Move src/p2p/\* → src/services/p2p/
- [x] Move src/utils/ai-hub-\*.ts → src/services/llm/
- [x] Move src/daemon/\* → src/services/daemon/
- [x] Move src/actions/handlers/\* → src/services/actions/handlers/
- [x] Update imports
- [ ] Test: npm run build && vitest run

## Phase 3: Actions Cleanup

- [x] Move src/actions/definitions/\*.md → docs/actions/definitions/
- [x] Update imports/references
- [ ] Test

## Phase 4: Config Extraction

- [x] Create packages/config/, move src/config/\*
- [x] Add feature flag configuration schema
- [x] Create feature manager utility
- [x] Add environment variable mapping
- [ ] Test config loader

## Phase 5: Types & Utils Cleanup

- [x] Move src/types/protocol\* → src/protocol/types/
- [x] Move src/types/\* → src/protocol/types/
- [x] Split src/utils/ → src/lib/ (pure) + services/ (domain)
- [x] Move pure utils to src/lib/
- [x] Move domain-specific utils to services/
- [x] Delete empty dirs (controllers/, etc.)

## Phase 6: Packaging Implementation

- [x] Create PACKAGING_PLAN.md with detailed strategy
- [x] Create DETAILED_PACKAGING_PLAN.md with step-by-step guide
- [x] Create PACKAGING_SUMMARY.md with current status
- [x] Add FEATURE_FLAGS.env example configuration
- [ ] Implement individual packages (@a2a/server-\*)

## Phase 7: Final Validation

- [ ] Full lint/build/test after packaging
- [ ] Update docs/architecture/\*.md with new structure
- [ ] Create package documentation
- [ ] Test feature flag configurations

Run `npm run build && vitest` after each phase.
