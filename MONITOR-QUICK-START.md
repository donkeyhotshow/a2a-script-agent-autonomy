# Task Monitor — launch tasks through session dialog

This document is the **operator entry point** for the Task Monitor: the same **Client API session dialog** the web UI uses (`sessions` → `next` → poll `async`), driven automatically from indexed markdown under `prompts-to-agent-mode/`.

| If you need… | Read first |
|--------------|------------|
| **Why** not `invoke` alone, router beats, curl shape | [`AGENTS.md`](AGENTS.md) → *Unified manual path*, *Router dialog* |
| **Indexed prompts** and stack rules | [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md), [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md) |
| **Env / ports** | [`.env.example`](.env.example) (`TASK_MONITOR_*`, `WEB_PORT`, `LOCAL_LLM_UPSTREAM_URL`, `AI_HUB_URL`) |
| **Schema / shape debugging** | [`tests/direct-tests/README.md`](tests/direct-tests/README.md) |
| **Terminology** | [`GLOSSARY.md`](GLOSSARY.md) → Task Monitor, ErrorClassifier, Direct Tests |
| **Red alert — human solo cycle** | [Solo developer workflow checklist](#red-alert-solo-developer-workflow-checklist) below |

## Red alert (solo developer workflow checklist)

Minimal bureaucracy for a **solo developer**, with guardrails against self-deception and lost detail. Use **before** or **alongside** running the Task Monitor ([`GLOSSARY.md`](GLOSSARY.md) → *Red alert*).

### 1. Brain dump

1. Write **every thought** without filtering (markdown / notes / issues).
2. Have the AI ask **clarifying questions** until it feels exhaustive.
3. State clearly: **what** you are doing, **why**, and **what you are not** doing.
4. Record **assumptions**.

### 2. Terms and meaning

5. Ask the AI for **term options**.  
6. Pick the **shortest, simplest** labels.  
7. Put a **glossary** in `README` or `DEV_STATE.md` (this repo: root [`DEV_STATE.md`](DEV_STATE.md), [`GLOSSARY.md`](GLOSSARY.md)).

### 3. Architecture (fast)

8. Ask the AI for: **one main** design, **one simpler**, **one hybrid**.  
9. No UML — **boxes + short text** only.  
10. For each option: **where you will break** / **what will hurt in a month**.

### 4. Lock the decision

11. Pick a **good enough** option.  
12. Write a **short ADR** (a couple of paragraphs) — see [`docs/adr/README.md`](docs/adr/README.md).

### 5. DEV_STATE.md (required)

13. One **authoritative** `DEV_STATE.md` per scope (here: root + modules per [`.cursor/rules/document-hierarchy.mdc`](.cursor/rules/document-hierarchy.mdc)).  
14. Inside: **current state**, **hacks**, **debt**, **fears**.

### 6. Code scan

15. Quick pass: **grep**, **TODO/FIXME**, **weird spots**.  
16. Mark where the **plan might be wrong**.

### 7. Minimal plan

17. Split into **1–4 hour** tasks.  
18. List them in `TODO.md`, `tasks/pending/`, or issues.  
19. **Order** them.

### 8. Stubs

20. **Mocks / stubs / TODO** where needed.  
21. Confirm **build + run** still work.

### 9. Implementation

22. Replace stubs with **real code**.  
23. Add **tests only** where it feels risky.  
24. Remove **lazy defaults**.  
25. Remove **silent failures** and swallowed exceptions.

### 10. Cleanup

26. Refactor **odd** areas.  
27. **Simplify APIs**.  
28. Delete **dead code**.

### 11. Self-check

29. Re-read the **original goal**.  
30. Exercise **negative** scenarios.  
31. Ask: **“Am I fooling myself right now?”**

### 12. Ship

32. **Deploy / integrate**.  
33. **Minimal** monitoring and logs.

### 13. After

34. Update **`DEV_STATE.md`**.  
35. Write down **what actually went wrong**.

### 100. Solo mistake guard

**Assume you missed something.**

- Check **edges**.  
- Check **negative** paths.  
- Check you did **not** over-engineer.  
- If in doubt — **simplify**.

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
- **Before a large or full-index run:** archive session folders you need from **`a2a-client/storage/sessions/`** (Self-Upgrade policy — [`tasks/README.md`](tasks/README.md) step 2, [`GLOSSARY.md`](GLOSSARY.md) *Session archival*). Reduces risk when many new sessions are created or storage is pruned later.

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
| `TASK_MONITOR_AI_HUB_URL` | AI Integration proxy base (default `http://localhost:11434`) — used to read `GET …/health` |
| `TASK_MONITOR_SKIP_PROMISE_GATE` | `1` / `true` — skip the interactive **OK** prompt when `promise_daemon_only` is on (CI / scripts) |

`LOCAL_LLM_UPSTREAM_URL` and `AI_HUB_URL` are used for health checks when set.

## AI Integration promise queue (`PROMISE_DAEMON_ONLY`)

When the proxy runs with **`PROMISE_DAEMON_ONLY=true`** (default in `ai-integration`), **`?promise=1`** LLM calls are **queued** under `ai-integration/proxy_logs/promises/` until the **promise daemon** runs them or you **`POST /promise/<id>/execute`**. The Task Monitor drives sessions that eventually hit that path, so async steps can **stall** if nothing drains the queue. **Do not** turn the queue off for “inline” forwarding — the supported contract stays **async** (daemon or manual `POST /promise/.../execute`).

On startup (after the normal health check), the monitor calls **`GET {TASK_MONITOR_AI_HUB_URL}/health`**. If the JSON includes **`"promise_daemon_only": true`**, it prints operator instructions (pending list, execute URL, prompt locations) and, in an **interactive** terminal, requires typing **`OK`** before continuing. Non-TTY runs skip the prompt but print a warning; automation should set **`TASK_MONITOR_SKIP_PROMISE_GATE=1`** (or rely on **`CI=true`**) when the daemon is guaranteed to be running.

Full workflow: [`ai-integration/docs/workflows/WORKFLOWS.md`](ai-integration/docs/workflows/WORKFLOWS.md). Proxy overview: [`ai-integration/README.md`](ai-integration/README.md).

## When something fails

Logs use **`ErrorClassifier`** ([`tests/monitor-tasks/errors.js`](tests/monitor-tasks/errors.js)): **hint**, **quick fix**, **direct test** command, **diagnostic steps**, and **relevant env vars**.

Run the suggested **direct tests** from repo root (PowerShell), for example:

```powershell
.\tests\direct-tests\run-checks.ps1 -Scope ClientServerLLM
.\tests\direct-tests\test-dialog-flow.ps1
```

See [`tests/direct-tests/README.md`](tests/direct-tests/README.md) for scopes and dialog runners.

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
