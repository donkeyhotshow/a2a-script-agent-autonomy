# Task Monitor — launch tasks through session dialog

This document is the **operator entry point** for the Task Monitor: the same **Client API session dialog** the web UI uses (`sessions` → `next` → poll `async`), driven automatically from indexed markdown under `prompts-to-agent-mode/`.

| If you need… | Read first |
|--------------|------------|
| **Why** not `invoke` alone, router beats, curl shape | [`AGENTS.md`](AGENTS.md) → *Unified manual path*, *Router dialog* |
| **Indexed prompts** and stack rules | [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md), [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md) |
| **Env / ports** | [`.env.example`](.env.example) (`TASK_MONITOR_*`, `WEB_PORT`, `OLLAMA_HOST`, `AI_HUB_URL`) |
| **Schema / shape debugging** | [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md) |
| **Terminology** | [`GLOSSARY.md`](GLOSSARY.md) → Task Monitor, ErrorClassifier, Direct Tests |

## What the instrument does

1. Reads each `*.md` in `prompts-to-agent-mode/` (or `TASK_MONITOR_TASKS_DIR`).
2. **`POST /api/a2a/sessions`** with **`mode: "agent"`** and task text from the file.
3. **`POST /api/a2a/sessions/{id}/next`** and **`GET /api/a2a/sessions/{id}/async`** in a loop until the step settles.
4. When the hydrated session shows **`form.choices`**, sends a **choice** (same contract as the UI: `result.choice` or top-level `task` as choice `id`).
5. Writes **`task-monitor-state.json`**, and on failures may emit **`hooks/`** payloads for follow-up.

The monitor is **not** a substitute for understanding the router: if the server asks an unexpected question, inspect **`GET /api/a2a/sessions/{id}`** (`includeContext=1` when debugging) and continue the dialog manually or adjust automation — see [`tasks/pending/monitor-router-interaction-followup.md`](tasks/pending/monitor-router-interaction-followup.md) for a real example.

## Prerequisites

- Stack up: **`start-all.bat`** from repo root (not ad-hoc `npm run dev` per package) — [`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md).
- Client API reachable at your configured base (default **`http://localhost:5173/api/a2a`**).

## Run commands

From repo root:

```bash
npm run monitor              # daemon: continuous watch loop
npm run monitor:daemon       # same (explicit)
npm run monitor:once         # one pass over tasks, then exit
npm run monitor:reset        # remove task-monitor-state.json (Windows-friendly)
```

Equivalent:

```bash
node monitor-and-process-tasks.js              # daemon
node monitor-and-process-tasks.js --daemon
node monitor-and-process-tasks.js --once
```

## Environment (`TASK_MONITOR_*`)

Defined in [`.env.example`](.env.example). Common overrides:

| Variable | Role |
|----------|------|
| `TASK_MONITOR_CLIENT_API_URL` | Client API base (default `http://localhost:5173/api/a2a`) |
| `TASK_MONITOR_SERVER_API_URL` | Server API for health (default `http://localhost:3000/api/v1`) |
| `TASK_MONITOR_PROJECT_ID` | Project for new sessions; if empty, first project from `GET /projects` |
| `TASK_MONITOR_POLL_INTERVAL_MS` | Delay between async polls |
| `TASK_MONITOR_MAX_POLL_ATTEMPTS` | Max poll iterations per task phase |
| `TASK_MONITOR_POLL_TIMEOUT_MS` | Wall-clock cap for polling |
| `TASK_MONITOR_TASKS_DIR` | Directory of task markdown files |
| `TASK_MONITOR_LOG_LEVEL` | `error` / `warn` / `info` / `debug` — `debug` prints full classified error JSON |

`OLLAMA_HOST` and `AI_HUB_URL` are used for health checks when set.

## When something fails

Logs use **`ErrorClassifier`** ([`tests/monitor-tasks/errors.js`](tests/monitor-tasks/errors.js)): **hint**, **quick fix**, **direct test** command, **diagnostic steps**, and **relevant env vars**.

Run the suggested **direct tests** from repo root (PowerShell), for example:

```powershell
.\scripts\direct-tests\run-checks.ps1 -Scope ClientServerLLM
.\scripts\direct-tests\test-dialog-flow.ps1
```

See [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md) for scopes and dialog runners.

## State and hooks

- **`task-monitor-state.json`** — current task, session id, processed entries, active tasks.
- **`hooks/`** — machine-readable issue documents when the monitor needs human or IDE follow-up.

## Tests

```bash
npx vitest run monitor-and-process-tasks.test.js
```

## Implementation map

| Area | File |
|------|------|
| Entry + wiring | [`monitor-and-process-tasks.js`](monitor-and-process-tasks.js) |
| API + polling + session | [`tests/monitor-tasks/task-monitor-api.js`](tests/monitor-tasks/task-monitor-api.js), [`tests/monitor-tasks/task-monitor-processing.js`](tests/monitor-tasks/task-monitor-processing.js) |
| Daemon / batch loop | [`tests/monitor-tasks/task-monitor-daemon.js`](tests/monitor-tasks/task-monitor-daemon.js) |
| Errors + direct-test hints | [`tests/monitor-tasks/errors.js`](tests/monitor-tasks/errors.js) |
| Config + `logError` | [`tests/monitor-tasks/task-monitor-core.js`](tests/monitor-tasks/task-monitor-core.js) |

For narrative history of fixes and architecture notes, see [`COMPLETION-REPORT.md`](COMPLETION-REPORT.md) if present.
