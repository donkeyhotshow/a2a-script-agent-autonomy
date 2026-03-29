# Documents state (WMD ledger)

**Purpose:** Track which markdown/task documents exist for the greedy-dump import and how they relate to implementation.

| Doc | Location | Status | Next action |
|-----|----------|--------|-------------|
| Index | `greedy-dump/README.md` | active | Keep in sync with STATE |
| Source pointer | `greedy-dump/SOURCE.md` | active | Update if SOURCE moves |
| Sequence | `greedy-dump/STATE.md` | active | Bump after each merge |
| Task tree | `greedy-dump/TASK-TREE.md` | active | Add node when new subfolder appears |
| This ledger | `greedy-dump/docs/DOCUMENTS-STATE.md` | active | Row per new `TASK.md` |
| Per-slice tasks | `greedy-dump/mirror/**/TASK.md` | active | Link PR / ADR when coded |
| Repo queue entry | `tasks/pending/greedy-dump-integration.md` | active | Close when import strategy is fully executed or superseded |

## Conventions

- **WMD** here means *workflow markdown documents*: human-readable state, not runtime config.
- When a slice is implemented in `a2a-server`, add a row: server path, action id, simulation id if any.
- Do not duplicate large binaries; reference `SOURCE.md` path instead.
