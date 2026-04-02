# Orchestrator metrics tracking

**Status:** done (2026-04-01)
**Tracked in:** [`DEV_STATE.md`](../DEV_STATE.md), [`work/STATE.md`](../work/STATE.md) (SYS backlog references), [`runtime/metrics.json`](../runtime/metrics.json).

## Goal

Automate the collection of orchestrator metrics (tasks/min, failure rate, LLM latency per provider) so dashboards no longer require manual refreshes.

## Scope

1. Instrument `monitor-and-process-tasks.js` so each processed session logs start/end timestamps, execution time, and `async` / `promise` statuses.
2. Build `scripts/orchestrator-metrics.js` (and `runtime/metrics.json`) to rehydrate per-day totals and summarize the LLM provider mix.
3. Expose a quick status command (via `node scripts/orchestrator-metrics.js --record`) that updates `runtime/metrics.json` and can be consumed by README reference or CI.

## Acceptance

- [x] `runtime/metrics.json` contains task counts per minute and a breakdown by provider; script runs automatically or on demand.
- [x] `monitor-and-process-tasks.js` emits logs that `scripts/orchestrator-metrics.js` can parse.
- [x] Dashboards / docs mention the new command so humans know how to refresh the metrics on demand.
