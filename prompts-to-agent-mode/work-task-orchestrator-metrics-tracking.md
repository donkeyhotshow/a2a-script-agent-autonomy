# Orchestrator metrics script (historical + ops)

## Sources

- [`tasks/orchestrator-metrics-tracking.md`](../tasks/orchestrator-metrics-tracking.md)
- [`scripts/orchestrator-metrics.js`](../scripts/orchestrator-metrics.js)
- [`runtime/metrics.json`](../runtime/metrics.json)

## Agent prompt (copy)

Task marks core work **completed**. Use for verification: run `node scripts/orchestrator-metrics.js --record`, confirm `runtime/metrics.json` updates, document cadence in `DEV_STATE.md` if operators must run it manually.

## Completion

- [x] Done (metrics script and runtime output documented; command rerunnable)
