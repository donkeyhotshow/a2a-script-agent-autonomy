# Task Monitor modules

Runtime code for [`tests/monitor-and-process-tasks.js`](../../tests/monitor-and-process-tasks.js): `TaskMonitorCore` + mixins from [`monitor-modules.js`](monitor-modules.js).

**Invariant:** default daemon runs **one incomplete prompt at a time** (`await processTask` until done); the next file starts only after that. `parallel-monitor.js` is legacy / alternate wiring, not the default loop.

**Client sessions:** tooling does **not** prune by age; only explicit root / `a2a-client` cleanup scripts wipe `storage/sessions`. While the monitor runs, **`taskSessions`** keeps **one** Client API session per prompt until that task completes.

| Path | Role |
|------|------|
| `errors.js` | `ErrorClassifier`, `ServerUnavailableError` |
| `task-monitor-core.js` | Config, state, health, promise gate |
| `task-monitor-api.js` | Client API / server HTTP helpers |
| `task-monitor-processing.js` | Composes `processing/*` prototype mixins |
| `processing/rewind-disk.js` | Session step rewind on disk |
| `processing/router-gate.js` | Router / task-form auto-advance |
| `processing/task-files.js` | Prompt markdown listing |
| `processing/process-task.js` | `processTask` poll loop |
| `processing/parallel-monitor.js` | Optional parallel `activeTasks` helpers |
| `task-monitor-utils.js` | Shared helpers (`extractTaskDescription`, …) |
| `task-monitor-validation.js` | Session response validation |
| `task-monitor-log-scan.js` | Repo log sweep |
| `task-monitor-daemon.js` | `run` / `runDaemon` |
| `task-monitor-session-helpers.js` | Pure session/timeline helpers |
| `monitor-mixin.js` | `applyMonitorMixins` |
| `monitor-modules.js` | `TASK_MONITOR_MIXINS` order |

Completed prompts → **`sessionId`:** `npm run monitor:completed` (table) or `npm run monitor:completed:json` — use JSON **`merged`** (one row per prompt); sources: `task-monitor-state.json` + `task-monitor-completed-sessions.json`.

Regression: `npm run test:monitor` ([`tests/infrastructure/monitor-and-process-tasks.test.js`](../infrastructure/monitor-and-process-tasks.test.js)).
