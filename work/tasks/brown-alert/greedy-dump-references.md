# Distill: `greedy-dump/` references (missing tree)

## Artifact

- **Files:** [`prompts-to-agent-mode/greedy-dump-integration-and-slices.md`](../../prompts-to-agent-mode/greedy-dump-integration-and-slices.md), [`prompts-to-agent-mode/greedy-dump-task-tree-open-nodes.md`](../../prompts-to-agent-mode/greedy-dump-task-tree-open-nodes.md)
- **Table metadata in** `a2a-server/src/actions/definitions/*.md` (e.g. `source | greedy-dump/...`, `author | greedy-dump integration`).
- **Fact:** No `greedy-dump/` folder in this workspace.

## Why (Brown)

Prompts and ledgers describe a **parallel doc tree** that is not in-repo; operators get dead ends.

## Actions

1. **Decide:** Import a minimal `greedy-dump/` snapshot under `archive/` **or** remove/replace every reference with paths that exist (`tasks/`, `docs/`, action ids).
2. **Update** `DOCUMENTS-STATE` / TASK-TREE **or** delete those prompt files if obsolete.
3. **Align** action definition front-matter (`source` / `author`) with the chosen convention.

## Done when

No prompt or operator doc points at non-existent `greedy-dump/*` paths; or the tree exists under `archive/` with a one-line README.
