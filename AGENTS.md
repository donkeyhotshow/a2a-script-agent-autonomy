# AGENTS.md

Guidance for agents working in this repository.

**Self-Upgrade in one sentence:** **doing work** here always has **two phases**:  
1) **Execute concrete tasks** from `tasks/` + `DEV_STATE` in the IDE.  
2) **When those are empty, immediately switch to driving prompts through the Client API or `monitor-and-process-tasks.js`**, let those sessions surface new, testable tasks, and write them back into `tasks/` + `DEV_STATE` instead of stopping.

## Quick Reference

| Topic | Reference |
|-------|-----------|
| **Windows live stack restart** | **`start-all.bat`** from repo root only — not per-service `npm run dev` ([`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md)) |
| **Unified manual path** | **Client API only:** create session → **`mode: "agent"`** (or `execution.action`) → **`task`** → `next` + poll `async` — [Unified manual path](#unified-manual-path-client-api) |
| **Backlog prompts (live stack)** | **[`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md)** + **[`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md)** — indexed tasks; **must** use Client API as the UI (`sessions` / `next` / `async` + seed `mode: "agent"`), not `invoke` alone |
| **Task Monitor (run + docs + static tests)** | **[`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md)** · `npm run monitor` / `monitor:once` · regression: **`npm run test:monitor`** (also last step of **`npm run test:before-start`**) |
| **Self-Upgrade order (policy)** | Do **`tasks/`** + **[`tasks/ide-prompts/`](tasks/ide-prompts/README.md)** first; **before large monitor / session volume**, archive needed **`a2a-client/storage/sessions/`** trees ([`tasks/README.md`](tasks/README.md) step 2); run **`prompts-to-agent-mode/`** / monitor **after** — not enforced in code; **[`tasks/README.md`](tasks/README.md)** (*Self-Upgrade order*) |
| **Single pipeline (API → prompts → observe → improve)** | **[`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md)** — linear sequence + failure classes + doc map |
| **Master prompt (run full prompt index + loop)** | **[`START-FULL-SPECTRUM.md`](START-FULL-SPECTRUM.md)** — root; paste Agent block into IDE or session `task` |
| **Sessions / curl / agent tests** | Same surface: not `invoke` alone — [technical notes](#sessions-tests-and-agent-mode-where-to-send-http) |
| **Schema debugging start point** | **[`tests/direct-tests/README.md`](tests/direct-tests/README.md)** — reproduce shape issues here first, then sims/e2e |
| **Offline validators (LLM / execute shape, sessions, sims)** | **[`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md)** — scripts flag contract mistakes (e.g. top-level `message` + tool vs `execute.message`); run from repo root: `scan-promise-bodies`, `scan-session-responses`, `verify:gray-room`, `audit:sim-choice-descriptions`, `sim:check-md` |
| **Triangle triage + colored alerts** | **[`docs/TRIANGLE-WORKFLOW.md`](docs/TRIANGLE-WORKFLOW.md)** — vertices **A/B/C**, loop **0→4**; **[`GLOSSARY.md`](GLOSSARY.md)** *Alerts* (triage colors) vs *Rooms* (Gray/Red/Black **Room** runtime) |
| **Iterativity + full normalization** | **[`DEV_STATE.md`](DEV_STATE.md)** *Iterativity — conditions for full project normalization* — per-cycle gates, queue honesty, stop rules; **[`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md)** |
| **Practical evidence (mandatory)** | Every loop must record runtime evidence (test output, `sessionId`/`promiseId`, async status, or concrete diff). If missing, run a minimal experiment first, then log it — [`docs/agent-iteration-traps.md`](docs/agent-iteration-traps.md) *Evidence rule* |
| **Yellow alert (AI code scan)** | **[`docs/YELLOW-ALERT-SCAN.md`](docs/YELLOW-ALERT-SCAN.md)** — paste invocation; debt/hacks/TODO/contract smells; not the same as *Yellow alert (operator)* in [`GLOSSARY.md`](GLOSSARY.md) |
| **Async-only (no sync switch)** | Never add **sync** invoke, **inline** LLM forwarding, or operator docs that tell people to **disable** the promise queue to “unstick” work — [Async-only transport](#5-async-only-transport-mandatory) |
| Imports | **Server / NodeNext:** `.js` on relative imports. **`premium-ui`:** `@/` (Vite) — [`.cursor/rules/code-hierarchy.mdc`](.cursor/rules/code-hierarchy.mdc) |
| Test ENCRYPTION_KEY | Exactly 32 characters |
| Test DB | `a2a_test` (not `a2a_server`) |
| Action-Key Shape | ONE action per execute/result |
| DEV_STATE | Always update before/after tasks |
| **No actionable work** | **Not** “done”: empty queue **triggers** maintenance — prune `DEV_STATE` (root + modules), discover work, write tasks — see DEV_STATE Protocol (why below) |
| **Why iteration stops** | Misreads vs mitigations — [Why iteration stops](#why-iteration-stops-misreads-and-mitigations) |
| **Rules Q&A log (yes/no)** | **[`docs/PROJECT-RULES-QA.md`](docs/PROJECT-RULES-QA.md)** — interview answers only; normative text remains here + **DEV_STATE** |

### Empty queue — mandatory (not optional)

**Default human/agent misread:** “nothing in the queue” = work finished = stop. **In this repo that is wrong.**

1. **Prune** — Trim root and module `DEV_STATE.md` and any checklists: drop completed items, duplicates, noise.
2. **Discover** — Scan code, simulations, risks, backlog for real, testable work.
3. **Write** — Add concrete tasks to `DEV_STATE` and `tasks/pending/` as needed.
4. **Then drive the stack** — If, after (1)–(3), there is still no concrete work item to pick up, that is **not** a stop signal. It is an instruction to **hit the Client API or monitor**: create or resume sessions via `/api/a2a/sessions` (or `monitor-and-process-tasks.js` + `prompts-to-agent-mode/`) and let those runs surface new, testable tasks that you then write back into `DEV_STATE` + `tasks/`.

Stopping with an empty queue **without** (1)–(3) is a protocol violation. Full rationale: [DEV_STATE Protocol](#dev-state-protocol); task wording: [methodology/tasks.md](archive/methodology/tasks.md).

**Minimal or vague user prompt is not a stop signal.** Silence, a one-liner, or no restated acceptance criteria does **not** mean “single turn then exit.” Keep iterating until stated criteria are met (or until you have honestly blocked and logged why). If there is no pending task text, still run (1)–(3) above instead of stopping. A stuck session after `next` is usually a **router contract** issue—inspect `GET …/sessions/{id}` and send **`message`** vs **`choice`** per [Router dialog](#router-dialog-two-beats--read-this); that is a fix, not an excuse to halt.

### Evidence-first loop (mandatory)

Every iteration must include **practical evidence**, not only reasoning:

1. Run one concrete check (test/sim, session turn, curl poll, or targeted script).
2. Capture identifiers + terminal signal (`sessionId`/`promiseId`, pending/completed/failed, pass/fail).
3. If evidence is missing, run a **minimal experiment** first, then continue decisions.
4. Write the evidence in `DEV_STATE` (what ran, observed outcome, next action).

**No evidence = no closure.** Missing runtime proof is an open item, not completion.

---

## Unified manual path (Client API)

This repo’s **one integration contour** for driving the stack after a **manual** start (`start-all.bat` / `start-all.sh`) is the **Client API**, not raw `POST /api/v1/invoke`. Treat every operator, IDE agent, and curl script the same way the web UI is treated: **sessions live here**; the server is reached **inside** the client layer.

### Steps (normative)

1. **Create a new session** — `POST /api/a2a/sessions` on the Client API base URL (default dev: `http://localhost:5173`). Standalone SDK uses the **same path contract** on its own origin/port; see [ADR-0028](docs/adr/ADR-0028-client-api-deployment-modes.md). Optional on the same request: **`projectId`** / **`projectRoot`** (project storage), **`task`** (seed `context.task`), **`mode`** or **`execution`** (seed `context.execution` — see [`session-create-initial.js`](a2a-client/packages/vite-plugin/routes/utils/session-create-initial.js)).
2. **Drive turns with `POST /api/a2a/sessions/{id}/next`**, then poll **`GET /api/a2a/sessions/{id}/async`** (and/or **`GET …/sessions/{id}`** to hydrate `execute`) until the step settles — same contract as the web UI.

### Router dialog (two beats — read this)

The flow is **not** a single “send everything once” form. It mirrors the **task-flow UI**: first you give **what to work on**, then you often pick **how** (e.g. **Agent** vs dialog vs decomposition) from a **router** list.

1. **Beat A — direction of work** — Right after create, the session usually exposes `execute.form` with a **text task field** (“Enter your task”). The first `POST …/next` must carry that text as **`result.message`** (or use the shorthand **`task`** field in the JSON body; the plugin maps it to `message` when the prior step had **no** `form.choices`). The server then classifies the request and may return a **router** screen.
2. **Beat B — pick a pipeline (e.g. Agent)** — When the latest server-backed `execute.form` includes **`choices`** (each with stable **`id`**, `label`, optional `description`, `type` such as `agent` / `dialog`), the UI shows **buttons** instead of free text. The next `POST …/next` must send **`result.choice`** set to the chosen row’s **`id`**. Shorthand: put that id in the top-level **`task`** field — if the previous step had choices, the same `task` key is interpreted as **`choice`**, not free text:

```46:51:a2a-client/packages/vite-plugin/routes/step-routes-router-flow.js
export function buildSubmitResult({ body, hasChoices }) {
    const { result, task } = body || {};
    if (result) return result;
    if (!task) return undefined;
    return { [hasChoices ? 'choice' : 'message']: task };
}
```

The coarse UI stage for that router screen is **`routing`** (choices or `execution.action === 'router'` / step `routing`):

```41:47:a2a-client/packages/vite-plugin/routes/utils/session-stage-machine.js
    const hasChoices = !!(form && Array.isArray(form.choices) && form.choices.length > 0);

    // Router stage: explicit routing form with choices.
    if (hasChoices || action === 'router' || step === 'routing') {
        return 'routing';
    }
```

**Operator shortcut:** seed **`mode: "agent"`** (or `execution.action: "agent"`) on `POST /sessions` so `context.execution` starts in the agent pipeline; the server may still emit intermediate forms depending on prompts — always **inspect `GET …/sessions/{id}`** (`includeContext=1` when debugging) before composing the next body.

**Stable choice `id` values (fallback router, no keyword match):** `dialog`, `agent`, `task-decomposition` — canonical labels/descriptions/registered examples in **[`shared/router-static-choices.json`](shared/router-static-choices.json)** (`staticTailChoices`); server implementation: [`a2a-server/src/services/core/request-processor/action-request-processor.ts`](a2a-server/src/services/core/request-processor/action-request-processor.ts). With keyword matches, choices use **action registry** ids (same file lists examples such as `fix-vue-imports`, `fix-laravel-namespaces-and-uses`).

### Minimal example (seed agent + task on create)

```http
POST /api/a2a/sessions
Content-Type: application/json

{
  "projectId": "default",
  "mode": "agent",
  "task": "Verify ADR-0028 examples match this repo’s ports."
}
```

You still run **`/next`** + poll **`/async`** afterward; the two-beat router may or may not appear depending on the server response.

Implementation: [`session-create-initial.js`](a2a-client/packages/vite-plugin/routes/utils/session-create-initial.js) (also `POST .../sessions/task-add` and `.../task-execute`).

Operator narrative, **`POST /api/a2a/sessions` body** (`mode` vs `execution`, fallbacks, legacy aliases), and curl: [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md).

### Why iteration stops (misreads and mitigations)

Two surfaces: **IDE / Cursor agent** (edits repo, runs tools) vs **Client API session driver** (curl or script hitting `/api/a2a/*`). Same repo traps; mitigations differ by who owns the loop.

| Trap | IDE / Cursor agent | Client API driver |
|------|--------------------|------------------|
| Empty queue = “finished” | **Do not** exit. Prune → discover → write tasks (`DEV_STATE`, `tasks/pending/`), then continue. | If you only drive HTTP, still **do not** treat “no local tickets” as done when the assignment is stack verification—follow project idle protocol or explicit checklist. |
| Vague / one-line user prompt | **Not** one-shot permission. Iterate until criteria met or log a **blocker** with evidence. | Same: complete **`/next` + poll `/async`** (and re-hydrate session), not a single POST. |
| Wrong router beat | Read `GET …/sessions/{id}`; send **`message`** / `task` as text when there are **no** `form.choices`; send **`choice`** / `task` as **choice `id`** when choices exist. | Scripted rule: after each response, **inspect** `execute.form`; branch body shape before next `/next`. |
| Stopped after `/next` ack | N/A | Poll **`GET …/async`** until final; **`GET …/sessions/{id}`** if unsure. |
| Raw `invoke` only | Prefer Client API for session persistence; use server direct only as **documented** workaround. | Default path: **`POST /sessions`** → `/next` → `/async`, not `POST /api/v1/invoke` alone. |
| Stack / promise pending | Diagnose ports (`AGENTS.md` Debugging), retry with backoff; log env (Local LLM upstream, AI hub). If Local LLM upstream is **actively generating**, do **not** restart the stack — [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) → *Local LLM upstream is generating — pause other work*. If Local LLM upstream is **idle** but status stays `processing`, treat as **stuck**. | Same; do not declare failure on first `pending`. After you confirm the model is working on the request, avoid parallel load / restarts until `async` settles. If Local LLM upstream is **idle** but status stays `processing`, treat as **stuck** — same section. |
| 401 / 400 (auth, `ENCRYPTION_KEY`) | Fix `.env` (32-char key, `JWT_SECRET`); retry. | Same. |
| “Need more context” loop-killer | State assumptions, proceed, verify; don’t halt on questions unless the user must decide. | Seed **`mode: "agent"`** + concrete **`task`** on create when allowed. |
| No definition of done | Add tests, checklist, or sim run before declaring complete. | Use [`a2a-client/docs/api-testing-plan.md`](a2a-client/docs/api-testing-plan.md) for manual Client API depth. |
| `DEV_STATE` stale | Update before/after work so the next pass sees real queue state. | When fixing stack behavior, record in `DEV_STATE` / tasks for follow-up agents. |
| Golden sim / action-key failures | Fix shape (one action key per `execute`/`result`); re-run `sim:lint` / `sim:validate`. | N/A unless authoring sims. |

Driver-oriented step list: [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) → *Driver checklist (anti-stop)*.

---

## Critical Rules

### 0. Schema Debugging Entry Point (MANDATORY)
For schema-level debugging, start with **[`tests/direct-tests/README.md`](tests/direct-tests/README.md)** (section *Schema debugging — start here*). Reproduce and isolate the shape issue there before moving to session-flow checks, simulations (`sim:lint` / `sim:validate`), or full end-to-end runs. [`simulations/SCHEMA.md`](simulations/SCHEMA.md) points here so sim authors do not skip this step.

**Validators** (high-signal, offline checks — not Vitest): **[`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md)**. They print concrete problems (wrong assistant-line placement, missing router `description`, MD/JSON drift in sim mirrors, gray-room snapshot consistency). Use them when debugging LLM outputs, proxy logs, or saved sessions before chasing issues in full UI flows.

### 1. Imports with Path Aliases
Use `.js` extension: `import x from '@/services/x.js'` (NodeNext module resolution)

### 2. Testing
- ENCRYPTION_KEY: exactly 32 characters
- Database: `a2a_test`

### 3. Action-Key Shape (MANDATORY)
```json
{ "execute": { "script": { ... } } }
{ "result": { "read-file": { ... } } }
```
NOT: `{ "execute": { "action": "...", ... } }` or `{ "result": { "content": "..." } }`

### 4. Golden Simulations
- Single action per `response.json` execute
- `received.json`: client-sanitized (no `rag-search`, `read-file` in execute; only result)
- Workbench in `context.workbench.sections`
- No deprecated execute types (`execute.error-recovery`)
- Router choices need descriptive `description` + stable `id`
- Form metadata: title/description (not input array)

### 5. Async-only transport (MANDATORY)
**Do not** introduce or document a "switch to sync" path. This stack is **async end-to-end**: `POST /api/v1/invoke` returns **`promiseId`** only; terminal `execute` / `context` come from **polling** (`GET …/requests/{id}/result`, Client API **`GET …/async`**). For **ai-integration**, **`?promise=1`** traffic is **queued** when **`PROMISE_DAEMON_ONLY`** is on (default): drain it with the **promise-queue daemon** or **`POST …/promise/<id>/execute`** — **not** by turning the queue off for inline/synchronous forwarding. PRs and operator runbooks must **never** treat disabling the queue or adding a sync invoke flag as an acceptable workaround.

### 6. Client-Server Data Separation (MANDATORY)
Strict separation between a2a-client and a2a-server must be maintained to prevent data leakage:
- Client must not send internal data (sessionIds, project metadata) to server.
- Server must not send internal data (gray room processing, secrets, internal LLM chains like compress_history, thinking, auto_rag_page, auto_read_file, clarify) to client.
- Server responses should only include sanitized execute/context for client consumption. Internal server-side operations (e.g., gray room) must not appear in responses, as they could expose sensitive processing details or secrets if leaked.

---

## A2A Protocol

### Overview
`POST /api/v1/invoke` returns **`promiseId`**; terminal **`execute` / `context`** come from **`GET /api/v1/requests/{id}/result`** (poll until `completed` / `failed`). The Client API uses the same contour via **`/next` + `GET …/async`**.

### PromiseId polling (normative)
Do **not** apply wall-clock timeouts or max-attempt caps to **polling `GET /api/v1/requests/{promiseId}/result`**, **`GET /api/a2a/sessions/{id}/async`** until idle/settled, or Client API layers that mirror those. Wait until `status` is terminal (`completed` / `failed` / `cancelled`) or async is no longer pending; only **interval/backoff** between polls is allowed. Optional **per-request** HTTP timeouts on unrelated calls (health checks, stack probes) are fine. Implementation: [`a2a-client/packages/vite-plugin/daemon/a2a-result-poll.js`](a2a-client/packages/vite-plugin/daemon/a2a-result-poll.js), [`shared/api-helpers.js`](shared/api-helpers.js) (`DEFAULT_POLL_TIMEOUT` is unbounded for session-async helpers).

### Action-Key Shape (Mandatory)
All `execute` and `result` objects use single action-type key:
```json
{ "execute": { "script": {...} } }
{ "result": { "read-file": {...} } }
```

### AI-Action Transform
LLM controls `context.execution.step` → server persists via transforms.

### Request Flows

| Step | Response |
|------|----------|
| `POST /api/v1/invoke` | `{ data: { promiseId, status: "pending", pollUrl } }` |
| Poll `GET /api/v1/requests/{promiseId}/result` | `status` → `completed` / `failed`; body includes `execute`, `context` when done |

**Dialog/LLM deferral:** For the dialog transform pipeline, many hub/transform/LLM failures **do not** finalize `promiseId` as `failed` immediately; the server re-queues the same id (`pending` + `retryAfter`) until success or max retries. Normative detail: **[`docs/PROMISE-RETRY-DIALOG.md`](docs/PROMISE-RETRY-DIALOG.md)**.

### Context Fields (System-Managed)
- `context.history` — execution records
- `context.execution` — current state (action, step, progress)
- `context.workbench` — structured state (`sections`, optional `batch`, optional `slots`)
- `context.session_id` — server-assigned session identifier (`srv_sess_*`); the client never forwards its own storage `sessionId`
- `context.operationHistory[]` — lightweight operation tracking (llm_call, transform, interrupt, etc.) for debug/audit

### Simulation Pipeline
```
request.json → server-transforms-request.json → request.md → [LLM] → response.md → server-transforms-response.json → response.json
```
Note: Server always applies transforms; `response.md` optional (no LLM).

---

## Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| PORT | 3000 (default) | No |
| SKIP_AUTH | 1 (dev) | No |
| ENCRYPTION_KEY | 32 chars | Yes |
| JWT_SECRET | 32+ chars | Yes |
| A2A_GRAY_ROOM_ENABLED | unset or `1` = on; `0`/`false` = off | No |
| A2A_BLACK_ROOM_ENABLED | Enable Black Room (Algorithm Mode) | No |
| A2A_BLACK_ROOM_COMPAT_LLM_URL | Local LLM upstream URL for Black Room (default: http://localhost:11435) | No |
| A2A_BLACK_ROOM_DEFAULT_MODEL | Default Local LLM upstream model for algorithms (default: llama3.1:8b) | No |
| A2A_BLACK_ROOM_TIMEOUT_MS | Timeout for algorithm execution (default: 30000ms) | No |
| A2A_ALGORITHM_REGISTRY_PATH | Path to algorithm templates (default: ./prompts/algorithms/) | No |
| REQUEST_RETRY_DELAY_MS | Dialog deferral: ms before a re-queued request is eligible (default 15000) | No |
| REQUEST_MAX_RETRIES | Dialog deferral: max re-queues per `promiseId` (default 15) | No |

---

## System Architecture

```
Web UI (5173) → Client API (5173/api/a2a) → A2A Server (3000) → AI Hub (11434)
      ↓ Session Storage ↓                           → Local LLM upstream (11435)
```

### Invoke payload privacy
- The Client API keeps the human-facing `sessionId`/`projectId` confined to `a2a-client/storage/…` and **strips them** before proxying to `/api/v1/invoke`. Project metadata (`projectId`/`projectRoot`) and any camelCase `sessionId` are removed before the server ever sees the payload.
- The stateless A2A Server always assigns its own `context.session_id` (currently `srv_sess_<uuid>`), returns it inside the response context, and the Client API reuses that server-issued token for follow-up invokes. That lets multi-step actions stay bound to a server session without leaking project or storage identifiers.
- Server responses must be sanitized: internal processing like gray room (server-side LLM chains) must not be included, as they are internal server operations that could expose secrets if leaked.

### Ports
| Port | Service | Role |
|------|---------|------|
| 11435 | Local LLM upstream | LLM |
| 11434 | AI Integration | Proxy |
| 3000 | a2a-server | API (stateless) |
| 5173 | Vite | Web UI + Client API |

### Live stack restart (Windows)

Use **`start-all.bat`** at the repository root for any full or partial “turn it off and on again” need. It performs `kill-all`, port checks, and ordered startup. **Do not** run `npm run dev` (or `npm start`) inside individual packages to restart one service—those processes are not tracked the same way and commonly cause duplicate listeners and broken PID files. Linux/macOS: use **`start-all.sh`** the same way.

### Sessions, tests, and agent mode (where to send HTTP)

The **operator sequence** is spelled out above: [Unified manual path (Client API)](#unified-manual-path-client-api). This subsection is the technical backing.

1. **Session lifecycle** (create session, `next`, poll `async`, disk step folders) is owned by the **Client API**, not by calling **`POST /api/v1/invoke`** on the A2A Server alone. In the default dev stack, that is **same origin as the web app**: `http://localhost:5173/api/a2a/*`. The UI, curl-based operators, and methodology that drive **sessions** all hit this surface.
2. **Standalone SDK** (`a2a-client/packages/sdk`) can expose the **same route contract** on its own HTTP port (often `3001` or `PORT`). That is an alternate deployment, not a different protocol. Normative split: [ADR-0028](docs/adr/ADR-0028-client-api-deployment-modes.md). **GET session / messages** query flags (`unwrap`, `includeContext`, `afterSeq`): [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) § *GET session JSON shape*.
3. **A2A Server (`:3000`)** is **stateless** `invoke` + request IDs. The Client API proxies to it and persists steps under `a2a-client/storage/sessions/`.
4. **Agent mode** is **not** a separate HTTP route. You **select it at session creation** via `mode` / `execution` in the `POST /sessions` body (or it appears later in `context` after server turns). Ongoing checks: `context.execution.action === 'agent'` and/or workbench; see [ADR-0030](docs/adr/ADR-0030-unified-agent-mode.md) and [`a2a-client/docs/WEB_UI_PROTOCOL.md`](a2a-client/docs/WEB_UI_PROTOCOL.md).

Operator curl walkthrough: [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md).

---

## API Endpoints

### Client API (Vite Plugin) - Port 5173
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/a2a/projects` | List projects |
| GET | `/api/a2a/sessions` | List sessions |
| POST | `/api/a2a/sessions` | Create session (body: `task`, optional **`mode`** or **`execution`**, `projectId` / `projectRoot`) |
| GET | `/api/a2a/sessions/{id}` | Get session (`?includeContext=1` debug; **403** in production) |
| GET | `/api/a2a/sessions/{id}/messages` | Message delta (`afterSeq`, `limit`, `withExecute`) — [`WEB_UI_PROTOCOL.md`](a2a-client/docs/WEB_UI_PROTOCOL.md) § *GET `/messages`* |
| PUT | `/api/a2a/sessions/{id}` | Update session |
| POST | `/api/a2a/sessions/{id}/next` | Send message (ack only) |
| GET | `/api/a2a/sessions/{id}/async` | Poll async (preferred) |
| GET | `/api/a2a/sessions/{id}/promise/{promiseId}` | Poll promise (legacy) |

### A2A Server - Port 3000
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/invoke` | Invoke request |
| GET | `/api/v1/requests/{id}` | Get status |
| GET | `/api/v1/requests/{id}/result` | Get result |

---

## Session Storage Format

```
a2a-client/storage/sessions/{sessionId}/
├── {stepNum}/
│   ├── client-result.json       (user input/choice)
│   ├── request-to-server.json   (payload sent)
│   ├── server-response.json     (execute/context/result)
│   ├── server-promise.json      (optional, async pending)
│   └── messages.json            (conversation slice)
```

**Rebuild from highest step with server-response.json.**

---

## Debugging

```bash
# Health checks
curl http://localhost:3000/health              # A2A Server
curl http://localhost:11434/health             # AI Integration
curl http://localhost:11435/api/tags           # Local LLM upstream
curl http://localhost:5173/api/a2a/projects    # Client API

# Test async (2-minute timeout typical)
curl http://localhost:3000/api/v1/requests/{promiseId}/result
# Check status, wait, retry if "processing"
# While "processing": confirm Local LLM upstream is actually generating (e.g. curl http://localhost:11435/api/ps) before restarts; see docs/OPERATOR-CURL.md → "Local LLM upstream is generating — pause other work"
```

---

## Testing

```bash
# Simulations
npm run sim:lint -- --all --json
npm run sim:validate -- --all --json

# Unit tests
cd a2a-server && npm run test
cd a2a-client && npm test
```

---

## Common Issues

| Problem | Solution |
|---------|----------|
| 404 on `/invoke` | Use `/api/v1/invoke` |
| 400 on `/steps` | Check execute/messages/context fields |
| 401 Unauthorized | Set JWT_SECRET (32+ chars); use SKIP_AUTH=1 (dev) |
| Promise stays "pending" | Check Local LLM upstream, AI Hub, LLM response time (2 min). If status is `processing`, **first** confirm Local LLM upstream (or proxy) is **actively generating**; **then** pause other work (no stack restart, no parallel load on the same Local LLM upstream, no extra `/next` spam) until the call completes — [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) → *Local LLM upstream is generating — pause other work*. If Local LLM upstream is **idle** but status stays `processing`, treat as **stuck**. |
| Session not found | Verify ID format `sess_{timestamp}_{random}` |
| LLM not responding | Check Local LLM upstream models: `curl http://localhost:11435/api/tags` |

---

## Architecture Decisions (ADRs)

See [docs/adr/README.md](docs/adr/README.md) for full index (includes **Tooling**: orchestrated ADR compliance via Client API — [methodology/adr-compliance-orchestrator.md](archive/methodology/adr-compliance-orchestrator.md)):
- **ADR-0026** — Server LLM request prep (result → history)
- **ADR-0027** — Canonical docs map
- **ADR-0028** — Vite `/api/a2a` vs SDK Client API
- **ADR-0029** — Server interrupt loop (gray room)

---

## Key Concepts

| Term | Meaning |
|------|---------|
| **Action-Key Shape** | Single action type per execute/result object |
| **Workbench** | Structured state in `context.workbench.sections` |
| **Promise** | Async request ID for polling long-running work |
| **Gray Room** | Серверная цепочка LLM-вызовов (compress_history, thinking, auto_rag_page, auto_read_file, clarify) перед возвратом клиенту; не должна передаваться в ответе сервера — только внутренний процесс; без `interrupt` у agent-class **`result.completed`** (из JSON модели) может открыть syndicate / SIEGE — [`a2a-server/docs/GRAY-ROOM.md`](a2a-server/docs/GRAY-ROOM.md) |
| **Router** | Keyword-based routing (dialog/agent/task-decomposition) |
| **Sync golden (`simulations/sync/`)** | Simulation folder style (invoke-shaped goldens). Server transport is always **`promiseId` + poll** — not inline execute on POST; see **Purple alert** in [`GLOSSARY.md`](GLOSSARY.md). |
| **Web DTO** | Client-sanitized execute (only form, not tool calls) |
| **operationHistory** | Легковесный трек операций (llm_call, transform, interrupt) для debug/audit |

---

## DEV_STATE Protocol

**Always update:**
- Before starting a task
- After completing a task
- On any risk/status change

**Rules:**
- Root: cross-module facts only
- Each module: own implementation details
- No abstract statements; all tasks testable
- Remove completed; no dead roadmap items
- Tasks >14 days old → backlog with blocker reason
- **Idle queue (explicit):** **If** there is no actionable work — empty `tasks/pending/`, nothing to execute, checklists done — **then** do **not** treat that as “done for the day”. **First** prune root and module `DEV_STATE.md` (remove done items, duplicates, noise). **Then** discover new work (code, sims, risks, backlog) and **write** concrete testable tasks into the same files and `tasks/` as needed. **Then** resume the normal task cycle.

**Why this must be spelled out:** An empty backlog **feels** like closure (“nothing left to run”), but here it is a **state transition** into prune → discover → write. Without that rule, agents default to stopping; the protocol overrides that default.

See [DEV_STATE.md](DEV_STATE.md) and [docs/DOCUMENTATION-MACHINE-READABLE.md](docs/DOCUMENTATION-MACHINE-READABLE.md).

---

## Operational Protocol

### Phases (Simple to Complex)
1. **Environment** — Ports, Local LLM upstream, env vars
2. **Component Validation** — Unit tests, linting
3. **Integration (Simulations)** — sim:lint, sim:validate
4. **End-to-End** — Full system startup
5. **Production Readiness** — Logging, error handling, final tests

### Before Each Phase
Confirm previous phase passed and is stable.

### Mandatory Checklist
1. Action-Key Shape used? (JSON must have ONE action type)
2. DEV_STATE updated?
3. Current action "simple" or skipping phases?
4. Imports follow `.js` rule (NodeNext)?
5. If there was **no** pending work: did you **prune → discover → write** (see “Empty queue” above), not stop idle?

---

## References

| Document | Purpose |
|----------|---------|
| [DEV_STATE.md](DEV_STATE.md) | Current system state |
| [GLOSSARY.md](GLOSSARY.md) | Terminology |
| [docs/DOCUMENTATION-MACHINE-READABLE.md](docs/DOCUMENTATION-MACHINE-READABLE.md) | Doc standards |
| [simulations/SCHEMA.md](simulations/SCHEMA.md) | Simulation contract |
| [docs/ENV-MATRIX.md](docs/ENV-MATRIX.md) | Environment matrix |
| [docs/agent-iteration-traps.md](docs/agent-iteration-traps.md) | Why iteration stops (low-context); mitigations (Cursor vs Client API driver) |
| [prompts-to-agent-mode/README.md](prompts-to-agent-mode/README.md) | Indexed task prompts; live stack = Client API + `mode: "agent"` |
| Module state files | [a2a-client/DEV_STATE.md](a2a-client/DEV_STATE.md), [a2a-server/DEV_STATE.md](a2a-server/DEV_STATE.md), [ai-integration/DEV_STATE.md](ai-integration/DEV_STATE.md) |
