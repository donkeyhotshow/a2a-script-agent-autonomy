# Distill: broken `tasks/ide-prompts/*.md` links under `prompts-to-agent-mode/`

## Artifact

[`tasks/ide-prompts/`](../../tasks/ide-prompts/) only has [`README.md`](../../tasks/ide-prompts/README.md), but **several** monitor-queue files point at **missing** paths:

| Referenced (wrong) | Actual location |
|--------------------|-----------------|
| `tasks/ide-prompts/repo-task-specs-missing-restore.md` | [`prompts-to-agent-mode/repo-task-specs-missing-restore.md`](../../prompts-to-agent-mode/repo-task-specs-missing-restore.md) |
| `tasks/ide-prompts/doc-protocol-validation-examples.md` | [`prompts-to-agent-mode/doc-protocol-validation-examples.md`](../../prompts-to-agent-mode/doc-protocol-validation-examples.md) |

**Files with bad links (grep `tasks/ide-prompts` inside `prompts-to-agent-mode/`):**

- [`work-state-stale-links-and-s13.md`](../../prompts-to-agent-mode/work-state-stale-links-and-s13.md)
- [`README.md`](../../prompts-to-agent-mode/README.md) (index table row)
- [`dev-state-align-with-work-state.md`](../../prompts-to-agent-mode/dev-state-align-with-work-state.md)
- [`dev-state-client-test-failures.md`](../../prompts-to-agent-mode/dev-state-client-test-failures.md)
- [`dev-state-orchestrator-metrics.md`](../../prompts-to-agent-mode/dev-state-orchestrator-metrics.md)
- [`work-task-a2a-dev-state-improvements.md`](../../prompts-to-agent-mode/work-task-a2a-dev-state-improvements.md) (`doc-protocol-validation-examples`)

## Why (Brown)

Policy says IDE prompts live under `tasks/ide-prompts/`, but **inventory docs were never moved there** — links are dead.

## Actions

1. **Either** fix relative links to `../repo-task-specs-missing-restore.md` / `../doc-protocol-validation-examples.md` from each caller **or** copy those two files into `tasks/ide-prompts/` and keep paths as-is.
2. **Re-grep** `tasks/ide-prompts/` in `prompts-to-agent-mode/**/*.md` → should be zero false paths.
3. **Align** [`prompts-to-agent-mode/README.md`](../../prompts-to-agent-mode/README.md) index with the chosen layout.

## Done when

Every `prompts-to-agent-mode` link resolves; optional: real files exist under `tasks/ide-prompts/` per policy.
