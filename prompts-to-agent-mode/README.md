# Agent-mode prompts (project task index)

One file per task. Each file lists **sources** (canonical docs) and a **copy-paste prompt**. Check **Completion** in the file when done.

## Root state (`DEV_STATE.md`)

| Prompt file | Source |
|-------------|--------|
| [dev-state-router-drift-optional.md](dev-state-router-drift-optional.md) | [`DEV_STATE.md`](../DEV_STATE.md) (S10 optional) |
| [dev-state-client-test-failures.md](dev-state-client-test-failures.md) | [`DEV_STATE.md`](../DEV_STATE.md), [`a2a-client/DEV_STATE.md`](../a2a-client/DEV_STATE.md) |
| [dev-state-orchestrator-metrics.md](dev-state-orchestrator-metrics.md) | [`DEV_STATE.md`](../DEV_STATE.md) |

## Work focus (`work/STATE.md`)

| Prompt file | Source |
|-------------|--------|
| [work-state-01-concept-end-to-end.md](work-state-01-concept-end-to-end.md) | [`work/STATE.md`](../work/STATE.md) §1 |
| [work-state-02-unified-data-language.md](work-state-02-unified-data-language.md) | [`work/STATE.md`](../work/STATE.md) §2 |
| [work-state-03-agent-modes-gray-room.md](work-state-03-agent-modes-gray-room.md) | [`work/STATE.md`](../work/STATE.md) §3 |
| [work-state-04-gray-room-concept.md](work-state-04-gray-room-concept.md) | [`work/STATE.md`](../work/STATE.md) §4 |
| [work-state-stale-links-and-s13.md](work-state-stale-links-and-s13.md) | [`work/STATE.md`](../work/STATE.md) queue links (`tasks/` vs `work/tasks/`, missing S13 doc) |

## Work task specs (`work/tasks/`)

| Prompt file | Source |
|-------------|--------|
| [work-task-sync-documentation-router-drift.md](work-task-sync-documentation-router-drift.md) | [`work/tasks/sync-documentation-and-router-drift.md`](../work/tasks/sync-documentation-and-router-drift.md) |
| [work-task-sync-substeps-not-discovered.md](work-task-sync-substeps-not-discovered.md) | [`work/tasks/sync-substeps-not-discovered.md`](../work/tasks/sync-substeps-not-discovered.md) |
| [work-task-sync-llm-snapshot-coverage.md](work-task-sync-llm-snapshot-coverage.md) | [`work/tasks/sync-llm-snapshot-coverage.md`](../work/tasks/sync-llm-snapshot-coverage.md) |
| [work-task-sync-workspace-tools-golden-map.md](work-task-sync-workspace-tools-golden-map.md) | [`work/tasks/sync-workspace-tools-golden-map.md`](../work/tasks/sync-workspace-tools-golden-map.md) |
| [work-task-sync-readme-and-cli-gap.md](work-task-sync-readme-and-cli-gap.md) | [`work/tasks/sync-readme-and-cli-gap.md`](../work/tasks/sync-readme-and-cli-gap.md) |
| [work-task-sync-step-contract-warnings.md](work-task-sync-step-contract-warnings.md) | [`work/tasks/sync-step-contract-warnings.md`](../work/tasks/sync-step-contract-warnings.md) |
| [work-task-analyze-test-failures.md](work-task-analyze-test-failures.md) | [`work/tasks/analyze-test-failures.md`](../work/tasks/analyze-test-failures.md) |
| [work-task-orchestrator-metrics-tracking.md](work-task-orchestrator-metrics-tracking.md) | [`work/tasks/orchestrator-metrics-tracking.md`](../work/tasks/orchestrator-metrics-tracking.md) |

## Broken / missing reference

| Prompt file | Notes |
|-------------|--------|
| [work-task-system-improvement-priorities-missing.md](work-task-system-improvement-priorities-missing.md) | [`DEV_STATE.md`](../DEV_STATE.md) links `work/tasks/system-improvement-priorities.md` — file absent in repo; [`work/STATE.md`](../work/STATE.md) row SYS |

## Methodology (`methodology/`)

| Prompt file | Source |
|-------------|--------|
| [methodology-task-organize-dialog-test.md](methodology-task-organize-dialog-test.md) | [`methodology/tasks.md`](../methodology/tasks.md) row #1 |
| [methodology-task-export-debug-state.md](methodology-task-export-debug-state.md) | [`methodology/tasks.md`](../methodology/tasks.md) row #3 |
| [methodology-improvements-automation.md](methodology-improvements-automation.md) | [`methodology/improvements.md`](../methodology/improvements.md) |
| [methodology-adr-compliance-orchestrator.md](methodology-adr-compliance-orchestrator.md) | [`methodology/adr-compliance-orchestrator.md`](../methodology/adr-compliance-orchestrator.md) |
| [scripts-tests-hierarchical-suite.md](scripts-tests-hierarchical-suite.md) | [`scripts/tests/README.md`](../scripts/tests/README.md) |

## Client API manual verification (`a2a-client/docs/api-testing-plan.md`)

| Prompt file | Source |
|-------------|--------|
| [client-api-01-sessions-create-load.md](client-api-01-sessions-create-load.md) | §1 + checklist |
| [client-api-02-next-ack-first.md](client-api-02-next-ack-first.md) | §2 + checklist |
| [client-api-03-async-resolves-pending.md](client-api-03-async-resolves-pending.md) | §3 + checklist |
| [client-api-04-session-rebuild-highest-step.md](client-api-04-session-rebuild-highest-step.md) | §4 + checklist |
| [client-api-05-red-room-artifacts.md](client-api-05-red-room-artifacts.md) | §5 + checklist |

## Docs / simulations / imports

| Prompt file | Source |
|-------------|--------|
| [doc-protocol-validation-examples.md](doc-protocol-validation-examples.md) | [`docs/new-request-flow/PROTOCOL.md`](../docs/new-request-flow/PROTOCOL.md) |
| [doc-golden-simulations-web-dto-checklist.md](doc-golden-simulations-web-dto-checklist.md) | [`a2a-client/docs/GOLDEN-SIMULATIONS-CHECKLIST.md`](../a2a-client/docs/GOLDEN-SIMULATIONS-CHECKLIST.md) |
| [doc-server-elements-hierarchy-roadmap.md](doc-server-elements-hierarchy-roadmap.md) | [`a2a-server/docs/server-elements-hierarchy.md`](../a2a-server/docs/server-elements-hierarchy.md) |
| [doc-adr-0021-cross-browser-matrix.md](doc-adr-0021-cross-browser-matrix.md) | [`docs/adr/ADR-0021-cross-browser-testing-matrix.md`](../docs/adr/ADR-0021-cross-browser-testing-matrix.md) |
| [doc-adr-0025-promise-ui-decouple.md](doc-adr-0025-promise-ui-decouple.md) | [`docs/adr/ADR-0025-decouple-promise-from-ui.md`](../docs/adr/ADR-0025-decouple-promise-from-ui.md) — Status: proposed |
| [doc-adr-0035-open-followups.md](doc-adr-0035-open-followups.md) | [`docs/adr/ADR-0035-agentic-reasoning-safety-layer.md`](../docs/adr/ADR-0035-agentic-reasoning-safety-layer.md) — ⏳ rows |
| [doc-adr-0036-master-orchestration-memory-proposed.md](doc-adr-0036-master-orchestration-memory-proposed.md) | [`docs/adr/ADR-0036-a2a-autonomous-agent-master-orchestration-memory.md`](../docs/adr/ADR-0036-a2a-autonomous-agent-master-orchestration-memory.md) |
| [greedy-dump-integration-and-slices.md](greedy-dump-integration-and-slices.md) | [`greedy-dump/docs/DOCUMENTS-STATE.md`](../greedy-dump/docs/DOCUMENTS-STATE.md) |
| [greedy-dump-task-tree-open-nodes.md](greedy-dump-task-tree-open-nodes.md) | [`greedy-dump/TASK-TREE.md`](../greedy-dump/TASK-TREE.md) |
| [sim-async-expand-coverage.md](sim-async-expand-coverage.md) | [`simulations/async/README.md`](../simulations/async/README.md) |

## Repo layout & ADR gaps

| Prompt file | Source |
|-------------|--------|
| [doc-readme-broken-troubleshooting-link.md](doc-readme-broken-troubleshooting-link.md) | [`README.md`](../README.md) → missing `docs/troubleshooting/standardize-stop-scripts.md` |
| [repo-tasks-pending-archive-layout.md](repo-tasks-pending-archive-layout.md) | [`START-PROMPT-UNLIM.md`](../START-PROMPT-UNLIM.md), [`methodology/orchestrator-api-exploit.md`](../methodology/orchestrator-api-exploit.md) vs actual `tasks/` tree |
| [doc-adr-0027-planning-readme-missing.md](doc-adr-0027-planning-readme-missing.md) | [`docs/adr/ADR-0027-documentation-canonical-sources.md`](../docs/adr/ADR-0027-documentation-canonical-sources.md) |
| [a2a-server-framework-detector-migration.md](a2a-server-framework-detector-migration.md) | [`a2a-server/docs/ADR/framework-detector-simplification.md`](../a2a-server/docs/ADR/framework-detector-simplification.md) |
| [doc-adr-reference-partial-adrs.md](doc-adr-reference-partial-adrs.md) | [`docs/adr/REFERENCE-A2A-master-specification.md`](../docs/adr/REFERENCE-A2A-master-specification.md) — Partial/Progress rows |
| [doc-adr-reference-not-implemented-v2.md](doc-adr-reference-not-implemented-v2.md) | Same REFERENCE — ❌ ADR-0037–0040 |
| [doc-simulation-template-authoring.md](doc-simulation-template-authoring.md) | [`docs/new-request-flow/SIMULATION-TEMPLATE.md`](../docs/new-request-flow/SIMULATION-TEMPLATE.md) |
| [sim-sync-agent-coder-smart-description-stubs.md](sim-sync-agent-coder-smart-description-stubs.md) | [`simulations/sync/agent-coder-smart/description.md`](../simulations/sync/agent-coder-smart/description.md) |
| [sim-sync-task-decomposition-description-stubs.md](sim-sync-task-decomposition-description-stubs.md) | [`simulations/sync/task-decomposition/description.md`](../simulations/sync/task-decomposition/description.md) |

## Modules & protocol docs

| Prompt file | Source |
|-------------|--------|
| [ai-integration-documentation-plan.md](ai-integration-documentation-plan.md) | [`ai-integration/plans/documentation-plan.md`](../ai-integration/plans/documentation-plan.md) |
| [ai-integration-ui-improvements-plan.md](ai-integration-ui-improvements-plan.md) | [`ai-integration/plans/ai-integration-ui-improvements-plan.md`](../ai-integration/plans/ai-integration-ui-improvements-plan.md) |
| [ai-integration-promise-queue-plan.md](ai-integration-promise-queue-plan.md) | [`ai-integration/plans/promise-queue-plan.md`](../ai-integration/plans/promise-queue-plan.md) |
| [ai-integration-configuration-system-plan.md](ai-integration-configuration-system-plan.md) | [`ai-integration/plans/configuration-system-plan.md`](../ai-integration/plans/configuration-system-plan.md) |
| [ai-integration-ollama-loop-detection-plan.md](ai-integration-ollama-loop-detection-plan.md) | [`ai-integration/plans/ollama-tuning-plan.md`](../ai-integration/plans/ollama-tuning-plan.md) |
| [doc-protocols-actions-roadmap-checklists.md](doc-protocols-actions-roadmap-checklists.md) | [`docs/new-request-flow/PROTOCOLS/`](../docs/new-request-flow/PROTOCOLS/) (actions + `states/cancelled.md`) |
| [doc-protocols-index-truth-vs-server.md](doc-protocols-index-truth-vs-server.md) | PROTOCOLS README / STAGES / actions index vs server + sims |
| [doc-protocols-message-loading-state.md](doc-protocols-message-loading-state.md) | [`PROTOCOLS/actions/message.md`](../docs/new-request-flow/PROTOCOLS/actions/message.md) — `loading` ⏳ |
| [methodology-proposals-folder-missing.md](methodology-proposals-folder-missing.md) | [`methodology/tasks.md`](../methodology/tasks.md) → broken `proposals/` link |
