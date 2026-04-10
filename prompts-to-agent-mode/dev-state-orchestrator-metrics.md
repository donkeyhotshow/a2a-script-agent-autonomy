# Orchestrator metrics: keep current

## Sources

- [`DEV_STATE.md`](../DEV_STATE.md) — **Pre-existing issues** (periodic update)
- Historical spec: `tasks/orchestrator-metrics-tracking.md` — [`tasks/ide-prompts/repo-task-specs-missing-restore.md`](../tasks/ide-prompts/repo-task-specs-missing-restore.md)
- [`scripts/orchestrator-metrics.js`](../scripts/orchestrator-metrics.js) (if present at repo root)

## Agent prompt (copy)

Verify orchestrator metrics still update on each cycle (`runtime/metrics.json` or documented path). If stale, fix the task-execute integration or document the operator command (e.g. `node scripts/orchestrator-metrics.js --record`). Update `DEV_STATE.md` after verification.

## Completion

[X] Completed
