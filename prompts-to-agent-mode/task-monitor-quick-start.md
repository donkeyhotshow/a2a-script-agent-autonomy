# Task Monitor quick start

**Canonical operator doc (keep in sync):** [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md)

When refreshing that doc, keep explicit that **each indexed `.md` prompt** must be driven through the **full session loop** (same **`sessionId`**, **`/next`**, **`/async`**, router **`choices`**) — operators confuse “run the file” with a single API call; see [`README.md`](README.md) callout and [`STACK-RUN.md`](STACK-RUN.md).

## Sources
- [`tests/monitor-and-process-tasks.js`](../tests/monitor-and-process-tasks.js)
- [`tests/infrastructure/monitor-and-process-tasks.test.js`](../tests/infrastructure/monitor-and-process-tasks.test.js) + [`tests/monitor-tasks/`](../tests/monitor-tasks/)
- `task-monitor-state.json`
- `hooks/`

## Agent prompt (copy)
Write or refresh [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md) so it mirrors `tests/monitor-and-process-tasks.js` + `tests/monitor-tasks/*` and the **static** Vitest suite. The reference should cover:

1. **What Was Done** – enumerate the six critical fixes (router choice handling, double task submission prevention, improved task extraction fallback, promise-aware poll loop, accurate hardbit logging, session verification safeguards).
2. **Daemon System** – describe graceful shutdown/signals, 30-second status reporting, hook document generation for failures, non-blocking async task monitoring, and the health-check scaffolding.
3. **Running the Script** – show both the default daemon invocation (`node tests/monitor-and-process-tasks.js`) and the single-pass mode with `--once`.
4. **What It Does** – explain that the monitor watches `prompts-to-agent-mode/`, spins up A2A agent-mode sessions, logs progress every 30 seconds, writes hook docs on failure, and waits for active work before exiting.
5. **Monitoring Status** – document the `task-monitor-state.json` payload (current task, session ID, processed task history, active tasks).
6. **Hook Documents** – spell out the `hooks/` schema (task name, status, error detail, session context, suggested remediation, timestamp) and call out that they only appear for failed or timed-out tasks.
7. **Health Checks** – confirm the initial/final readiness probe hits Client API (`http://localhost:5173/api/a2a`), A2A Server (`http://localhost:3000`), AI Hub (`http://localhost:11434`), and optionally Local LLM upstream (`http://localhost:11435`) if configured (not started by repo).
8. **Test Suite + monitor defaults** – document `npm run test:monitor` (repo root) and static tests over the entry file + `tests/monitor-tasks/*.js`; note default **`TASK_MONITOR_STRICT_AGENT_COMPLETION=0`** (poll-only, no auto **`/next`**) in [`tests/monitor-and-process-tasks.js`](../tests/monitor-and-process-tasks.js); opt-in strict nudges + env vars in [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md) troubleshooting.
9. **Key Features Table** – list the big wins (Graceful Shutdown, Status Reporting, Hook Documents, Health Check, Promise Tracking, Error Handling) and their benefits.
10. **Troubleshooting** – answer the common questions: hangs (Ctrl+C → waits 30s), tasks not processing (verify services), missing hook docs (only written for failed/timeouts), session not found (check logs for created session ID).
11. **For More Details** – there is **no** root `COMPLETION-REPORT.md`; use [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md) + [`DEV_STATE.md`](../DEV_STATE.md). Gap: [`tasks/brown-alert/monitor-docs-duplicate-surfaces.md`](../tasks/brown-alert/monitor-docs-duplicate-surfaces.md).

Tie every section back to the actual code paths (`TaskMonitor` lifecycle, single-pass vs daemon loops, health-check endpoints, hook document writer, state serialization). When [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md) accurately reflects the automation and tests, mark the task as done.

## Completion
- [x] Done — canonical doc is [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md); static suite via **`npm run test:monitor`** (entry + `tests/monitor-tasks/*`).
