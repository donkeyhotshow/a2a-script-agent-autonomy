# Self-Upgrade monitor router follow-up

**Status:** pending → in progress  
**Context:** `node monitor-and-process-tasks.js` run on 2026-04-03 hit `ai-integration-configuration-system-plan.md` and left `sess_1775163935824` at `action=agent | step=new | status=idle | message=What would you like me to do?`. The run logged repeated “Task … completed but no result” lines, the script timed out (code 124) and emitted `EPIPE` while writing logs, and `hooks/task_monitor_issue.json` plus `task-monitor-state.json` hold the snapshot.

## Progress so far
1. The router form was refreshed via `/api/a2a/sessions/sess_1775163935824` and then `POST /next` with a human prompt (see `curl.exe .../next` in the log) telling the agent to continue the ai-integration configuration plan.  
2. `/api/a2a/sessions/{id}/async` and `/api/v1/requests/{promiseId}/result` now return `status: pending` (promise `prom_1775164401703_g29l65y66`), so the plan is still running inside the LLM stage. Continue polling until `asyncPending` becomes false and a result or new form arrives.

## What needs to happen next
1. Check `task-monitor-state.json` (session `sess_1775163935824`) and inspect the router form exposed by that session via the Client API (`/api/a2a/sessions/{id}` with `includeContext=1`). Decide which choice (e.g., `agent`, `dialog`, etc.) should come next and reply with `POST /api/a2a/sessions/{id}/next` (use `result.choice`/`task` as described in `prompts-to-agent-mode/STACK-RUN.md`).
2. Poll `/api/a2a/sessions/{id}/async` until the step finishes, then record the result/hook (a new `hooks/task_completion_report.json` or updated `task_monitor_issue` should appear).
3. If router prompts repeat for future runs, update `monitor-and-process-tasks.js` to either auto-select the correct `choice` or to emit clearer instructions, then re-run the daemon on `prompts-to-agent-mode/START-FULL-SPECTRUM.md`.

> Tip: the hook document lives at `hooks/task_monitor_issue.json` and lists suggested actions (“Review task description for clarity”, “Check session context and execution state”). Use it as a starting checklist when continuing the run.
