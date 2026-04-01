# Orchestrator metrics script (historical + ops)

## Sources

- **Spec (missing on disk):** `tasks/orchestrator-metrics-tracking.md` — see [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md); notes in root [`DEV_STATE.md`](../DEV_STATE.md)
- [`scripts/orchestrator-metrics.js`](../scripts/orchestrator-metrics.js)
- [`runtime/metrics.json`](../runtime/metrics.json) (generated)

## Agent prompt (copy)

Task marks core work **completed**. Use for verification: run `node scripts/orchestrator-metrics.js --record`, confirm `runtime/metrics.json` updates, document cadence in `DEV_STATE.md` if operators must run it manually.

## Completion

- [ ] Done (verified this cycle)
