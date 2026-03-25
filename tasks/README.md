# Data-shape alignment backlog (golden = `simulations/`)

**Full sorted list + tiers:** [`ALL-TASKS.md`](ALL-TASKS.md) (T001–T024).

**Authority:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md), [`simulations/CLIENT-SDK-IDEAL.md`](../simulations/CLIENT-SDK-IDEAL.md), [`AGENTS.md`](../AGENTS.md) (protocol rules).

**Verification:** `npm run sim:lint -- --all --json` (repo root), targeted `sim:validate` per sim after touching flows.

Each file below is one **small** upgrade. Order is suggested priority, not strict dependency.

| ID | File | Focus |
|----|------|--------|
| T001 | [`T001-web-execute-dto-parity.md`](T001-web-execute-dto-parity.md) | Vite plugin vs `@a2a/sdk` `buildWebExecute` |
| T002 | [`T002-sim-lint-web-dto-keys.md`](T002-sim-lint-web-dto-keys.md) | `sim-lint` vs client strip list |
| T003 | [`T003-invoke-first-step-context.md`](T003-invoke-first-step-context.md) | Router `context.execution` like goldens |
| T004 | [`T004-server-result-action-keys.md`](T004-server-result-action-keys.md) | No bare `result` blobs |
| T005 | [`T005-client-choice-vs-legacy-action.md`](T005-client-choice-vs-legacy-action.md) | `result.choice` vs `actions[]` |
| T006 | [`T006-session-artifact-names.md`](T006-session-artifact-names.md) | Runtime step files vs mental model |
| T007 | [`T007-router-form-metadata.md`](T007-router-form-metadata.md) | `form.choices[].description` |
| T008 | [`T008-sdk-extract-execute-tests.md`](T008-sdk-extract-execute-tests.md) | Single execute key invariant |
| T009 | [`T009-workbench-merge-parity.md`](T009-workbench-merge-parity.md) | Server + SDK `workbench` |
| T010 | [`T010-includeContext-debug-path.md`](T010-includeContext-debug-path.md) | Raw vs Web DTO in APIs |
| T012 | [`T012-flat-execute-action-removal.md`](T012-flat-execute-action-removal.md) | Tests: no `execute.action` |
| T013 | [`T013-client-api-envelope-unification.md`](T013-client-api-envelope-unification.md) | `success`/`data`/`session` unwrap |
| T014 | [`T014-transform-ops-doc-sync.md`](T014-transform-ops-doc-sync.md) | Transform module doc = real ops |
| T015 | [`T015-packages-json-actionid-vs-protocol.md`](T015-packages-json-actionid-vs-protocol.md) | JSON flow `actionId` clarity |
| T017 | [`T017-scratchpad-ops-end-to-end.md`](T017-scratchpad-ops-end-to-end.md) | `scratchpad_ops` lifecycle |
| T018 | [`T018-poll-result-context-filter.md`](T018-poll-result-context-filter.md) | Poll `/result` drops `workbench`/files |
| T019 | [`T019-async-poll-url-matrix.md`](T019-async-poll-url-matrix.md) | A2A vs Vite `/async` vs SDK URLs |
| T020 | [`T020-execute-wait-runtime-contract.md`](T020-execute-wait-runtime-contract.md) | `execute.wait` vs goldens |
| T021 | [`T021-agent-tool-chain-vs-single-execute.md`](T021-agent-tool-chain-vs-single-execute.md) | `agent-rag-chain` multi-invoke |
| T022 | [`T022-sdk-auth-middleware-todos.md`](T022-sdk-auth-middleware-todos.md) | SDK `auth.ts` validation gaps |
| T025 | [`T025-action-validator-vs-sim-lint-types.md`](T025-action-validator-vs-sim-lint-types.md) | Validator missing `rag-search`/… |
| T026 | [`T026-execute-message-zod-vs-ui.md`](T026-execute-message-zod-vs-ui.md) | `message` string vs object |
| T027 | [`T027-finalResult-vs-schema-top-level-result.md`](T027-finalResult-vs-schema-top-level-result.md) | `finalResult` vs SCHEMA `result` |
| T028 | [`T028-unify-simulation-response-validation.md`](T028-unify-simulation-response-validation.md) | Two response validators |

Add new tasks as `T0xx-*.md`; bump the table in this README.