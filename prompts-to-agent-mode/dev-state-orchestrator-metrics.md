# Orchestrator metrics: keep current

## Sources

- [`DEV_STATE.md`](../DEV_STATE.md) — **Pre-existing issues** (periodic update)
- [`work/tasks/orchestrator-metrics-tracking.md`](../work/tasks/orchestrator-metrics-tracking.md) — implementation notes
- [`scripts/orchestrator-metrics.js`](../scripts/orchestrator-metrics.js) (if present at repo root)

## Agent prompt (copy)

Verify orchestrator metrics still update on each cycle (`runtime/metrics.json` or documented path). If stale, fix the task-execute integration or document the operator command (e.g. `node scripts/orchestrator-metrics.js --record`). Update `DEV_STATE.md` after verification.

## Completion

- [ ] Done
