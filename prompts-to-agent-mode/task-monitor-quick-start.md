# Task Monitor quick start

## Sources
- `monitor-and-process-tasks.js`
- `monitor-and-process-tasks.test.js`
- `task-monitor-state.json`
- `hooks/`
- `COMPLETION-REPORT.md`

## Agent prompt (copy)
Write or refresh the Task Monitor quick-start reference so that it mirrors the automation encoded in `monitor-and-process-tasks.js` and the 17-test validation suite. If `COMPLETION-REPORT.md` does not exist, create it at the repository root; if it already exists, update it. The reference should cover:

1. **What Was Done** – enumerate the six critical fixes (router choice handling, double task submission prevention, improved task extraction fallback, promise-aware poll loop, accurate hardbit logging, session verification safeguards).
2. **Daemon System** – describe graceful shutdown/signals, 30-second status reporting, hook document generation for failures, non-blocking async task monitoring, and the health-check scaffolding.
3. **Running the Script** – show both the default daemon invocation (`node monitor-and-process-tasks.js`) and the single-pass mode with `--once`.
4. **What It Does** – explain that the monitor watches `prompts-to-agent-mode/`, spins up A2A agent-mode sessions, logs progress every 30 seconds, writes hook docs on failure, and waits for active work before exiting.
5. **Monitoring Status** – document the `task-monitor-state.json` payload (current task, session ID, processed task history, active tasks).
6. **Hook Documents** – spell out the `hooks/` schema (task name, status, error detail, session context, suggested remediation, timestamp) and call out that they only appear for failed or timed-out tasks.
7. **Health Checks** – confirm the initial/final readiness probe hits Client API (`http://localhost:5173/api/a2a`), A2A Server (`http://localhost:3000`), AI Hub (`http://localhost:11434`), and optionally Local LLM upstream (`http://localhost:11435`) if configured (not started by repo).
8. **Test Suite** – include the `npx vitest run monitor-and-process-tasks.test.js` command and the expectation of “17 passed (17)”.
9. **Key Features Table** – list the big wins (Graceful Shutdown, Status Reporting, Hook Documents, Health Check, Promise Tracking, Error Handling) and their benefits.
10. **Troubleshooting** – answer the common questions: hangs (Ctrl+C → waits 30s), tasks not processing (verify services), missing hook docs (only written for failed/timeouts), session not found (check logs for created session ID).
11. **For More Details** – mention that `COMPLETION-REPORT.md` houses detailed bug-fix narratives, architecture notes, test results, and the implementation checklist.

Tie every section back to the actual code paths (`TaskMonitor` lifecycle, single-pass vs daemon loops, health-check endpoints, hook document writer, state serialization). When the reference accurately reflects the automation and tests, mark the task as done.

## Completion
- [ ] Done
