# Operating the agent with curl (human or Cursor)

**Agent-mode API dialog — living log:** [`docs/AGENT-DIALOG-API-STATE.md`](AGENT-DIALOG-API-STATE.md) (chained `sessions` → `next` → `/async`, SDK notes, known driver risks).

## Instrument: launch tasks through session dialog

**Normative automation for indexed backlog tasks:** use the **Task Monitor** — same **Client API session dialog** as the web UI (`POST /sessions` → `/next` → poll `/async`, router beats). Operator doc: **[`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md)** (`npm run monitor`, `npm run monitor:once`, `TASK_MONITOR_*`, `ErrorClassifier` + direct-tests on failure). Full IDE + daemon loop narrative: **[`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md)**.
Testing command map for operators: [`OPERATOR-TESTING-MATRIX.md`](OPERATOR-TESTING-MATRIX.md).

**Manual operator (curl / script):** same HTTP contour as the monitor — you are the driver; the monitor is a scripted driver. Both are **not** `POST /api/v1/invoke` alone.

> **Task-from-doc trap:** pasting prompt text into **`POST /sessions`** without further **`/next`**/**`/async`** leaves work **pending**. One document ≠ one completed HTTP exchange.

## Sub-agent framing

Treat the **running A2A stack** as a **sub-agent**: a headless agent you call over **HTTP** (Client API). The **primary agent** is whoever sits in the **IDE** (e.g. Cursor): they reason, run the **Task Monitor** or **`curl`**, edit code. The sub-agent does **not** share the IDE’s context—it only sees what you send in the request body and returns structured **execute/result/context** (after polling async if needed).

Same mental model as “user types, waits for answer”—except the “user” may be the IDE agent with **`curl`**, or **`tests/monitor-and-process-tasks.js`** driving the same endpoints.

---

This repository **is** that stack: services run, and **work is driven by HTTP** (Client API sessions), not by the browser as the default control plane.

**Orchestration for backlog prompts** = **Task Monitor** + optional IDE follow-up on **`hooks/`** — see [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md). **One-off verification** = **`curl`** (or any HTTP client) on the same paths.

## What the operator does *not* do

- **Not** the default: open the browser and use the Vite UI as the only way to drive sessions (UI is valid; docs target **API + monitor**).
- **Not** the stability strategy: maintain a parallel “task ticket” ritual in `tasks/` instead of fixing **system** behavior.
- **Not** treat `POST :3000/api/v1/invoke` as the primary way to “run agent tasks” — that bypasses session storage and the dialog contour.

## What the operator *does* do

1. **Run services** from repo root: **`start-all.bat`** / **`start-all.sh`** for bootstrap/full reset — [`docs/SYSTEM_STARTUP.md`](SYSTEM_STARTUP.md).
2. **Launch indexed tasks through dialog:** **`npm run monitor`** or **`npm run monitor:once`** — [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md).
3. **Or talk to the Client API** directly (default **`http://localhost:5173`**) — same API the UI and monitor use, via **`curl`** or scripts.
4. **Wait for completion** on async work: poll **`GET /api/a2a/sessions/{id}/async`** until the response is final — same loop the Task Monitor implements.

**Hot-reload policy:** after normal code changes, do **not** ask for full-stack restart by default. Restart stack only for process/env/port-level faults (dead Vite/Client API process, stuck ports, changed env that requires process restart). Canonical policy: [`docs/SYSTEM_STARTUP.md`](SYSTEM_STARTUP.md).

## Schema debugging first step (mandatory)

Before session-level or e2e debugging, reproduce schema/shape problems in `tests/direct-tests`.

Escalation order:
1. `tests/direct-tests` (fast isolation of schema/action-key shape)
2. Client API session flow (`/sessions` -> `/next` -> `/async`)
3. Simulations (`sim:lint`, `sim:validate`)
4. Full stack/e2e

**Have a server `promiseId`?** `npm run report:promise -- <promiseId> --out trace.md` — [scripts/promise-artifacts-report.mjs](../scripts/promise-artifacts-report.mjs) aggregates storages + Gray Room steps into one Markdown file.

Full endpoint table: root **`AGENTS.md`** (Client API section).

## Web access and a2a-server

For **web** (browser), HTTP goes to the **same origin as the Vite app** — **`/api/a2a/*`** (Client API). The browser does **not** call `http://localhost:3000` directly.

Under that surface, work is still executed by **a2a-server**: the Client API forwards to **`POST {A2A_SERVER_URL}/api/v1/invoke`** and polls **`GET …/api/v1/requests/{promiseId}/result`** (or equivalent) while persisting sessions and projecting responses for the UI. So the **protocol and LLM pipeline** are **a2a-server**; the **session and operator-facing HTTP** for web and curl are **Client API**.

**Standalone SDK (`:3001`, `POST /api/sessions/:id/next`):** **request** body matches Vite (**`result`** or top-level **`task`**; shared router + merge pipeline). Prior-step **`execute.form.choices`** is read from step **`server-response.json`** when present. **Ack:** **`{ success, accepted, step, asyncPending }`**. Project-mode-only sessions (Vite) may still differ from SDK global `storage/sessions` layout — see [ADR-0028](adr/ADR-0028-client-api-deployment-modes.md).

**GET session JSON shape:** Vite **`GET /api/a2a/sessions/:id`** returns **only** the projected session object at the root. SDK **`GET /api/sessions/:id`** defaults to **`{ success: true, session: … }`**; add **`?unwrap=1`** for the same top-level session object as Vite. **`?includeContext=1`:** **403 in production** on both Vite and SDK (`NODE_ENV=production`). **`GET …/messages`:** Vite always uses delta query params (`afterSeq`, `limit`, `withExecute`); SDK returns **`{ success, data, count }`** unless **`afterSeq`** is present — then the **same delta JSON** as Vite (in-memory messages; Vite **project** storage mode can still 404 the delta). See [ADR-0028](adr/ADR-0028-client-api-deployment-modes.md) *Consequences*.

See also: [`a2a-client/docs/WEB_UI_PROTOCOL.md`](../a2a-client/docs/WEB_UI_PROTOCOL.md) (async polling matrix).

## Minimal mental model

See the [AGENTS.md](../AGENTS.md) *Unified manual path* section for the complete session dialog flow and router dialog patterns.

### `POST /api/a2a/sessions` body (create)

| Field | Role |
|-------|------|
| `task` | Seeds `context.task`. |
| `mode` | Shorthand for `context.execution`: only **`agent`**, **`dialog`**, and **`task-decomposition`** are recognized (case-insensitive). Any other string is **ignored** for this seed → `context.execution` defaults to **`{ "action": "task", "step": "new" }`** ([`session-create-initial.js`](../a2a-client/packages/vite-plugin/routes/utils/session-create-initial.js)). |
| `execution` | Object `{ "action": string, "step"?: string }`. If present with a non-empty `action`, it **wins** over `mode` (explicit pipeline seed). |
| `projectId` / `projectRoot` | Project storage binding (see root **`AGENTS.md`** *Invoke payload privacy* / session storage). |
| `llmModel` | Optional model id for Client API → hub routing (e.g. match **`GET http://localhost:11434/api/tags`**). |
| `title` | Optional session title (default `New Session`). |
| `id` | Optional storage session id; default `sess_<timestamp>`. |

**Legacy aliases** (same create logic, response uses slim session projection): `POST /api/a2a/sessions/task-add`, `POST /api/a2a/sessions/task-execute`.

**Create response** includes `stage`, `asyncPending`, and `promiseStatus` aligned with `GET …/sessions/{id}` ([`session-projection-dto.js`](../a2a-client/packages/vite-plugin/routes/utils/session-projection-dto.js)). Initial `execute` may contain both **`message`** and **`form`** — **Client API / UI bootstrap only** before the first server invoke; do not treat it as the server **action-key** `execute` from [`simulations/SCHEMA.md`](../simulations/SCHEMA.md).

### Invoke sanitization (`POST …/next` → a2a-server `/api/v1/invoke`)

The Client API keeps **`sessionId`**, **`projectId`**, and **`projectRoot`** on the **session record** and merged `context` for storage and tooling. Before every upstream invoke it **removes** them from the JSON sent to the stateless server (and drops **`clientSessionId`**). It also removes a mistaken **`context.session_id`** if it looks like a storage id (`sess_*`). Normative summary: root **`AGENTS.md`** → *Invoke payload privacy*.

| Removed from upstream `context` (and nested `context.context` if present) | Also removed from top-level invoke body |
|---------------------------------------------------------------------------|----------------------------------------|
| `sessionId`, `projectId`, `projectRoot`, `clientSessionId` | `sessionId`, `projectId`, `projectRoot` |
| `session_id` when value is `sess_*` | — |

Implementation (shared Vite + SDK): [`a2a-client/shared/a2a-invoke-builders.mjs`](../a2a-client/shared/a2a-invoke-builders.mjs) — `sanitizeContextForServer`, `sanitizeInvokeBodyForA2aUpstream`. Dialog `/next` path applies the full-body sanitizer in [`context-processor.js`](../a2a-client/packages/vite-plugin/routes/context-processor.js) `prepareServerRequest` so behavior matches the standalone SDK session routes.

## Driver checklist (anti-stop)

For production closure criteria and manual QA acceptance gates, use the canonical protocol: [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](OPERATOR-MONITOR-MANUAL-QA.md).

See the [AGENTS.md](../AGENTS.md) *Why iteration stops* section for detailed anti-stop patterns and driver checklist.

1. **`POST /api/a2a/sessions`** — optional: `task`, `mode` (`"agent"` / `"dialog"` / `"task-decomposition"`), or **`execution`**: `{ "action": "…", "step": "…" }`, plus `projectId` / `projectRoot`, `llmModel` (see **`GET http://localhost:11434/api/tags`**), `title`, `id` (full table above; root **`AGENTS.md`**).
2. **`GET /api/a2a/sessions/{id}`** — if `execute.form.choices` → next body uses **`result.choice`** (or `{ "task": "<id>" }`); else **`result.message`** / `{ "task": "<free text>" }`.
3. **`POST /api/a2a/sessions/{id}/next`** with the body from step 2.
4. **`GET /api/a2a/sessions/{id}/async`** — repeat until not pending / you have a settled `execute` (re-**GET session** if ambiguous).
5. If still stuck, re-run step 2; if **`GET …/sessions/{id}`** shows **`asyncPending`** but thin **`execute`**, keep polling **`/async`** then re-GET session. For **direct** A2A polling you need a server **`prom_*` id** (from step `server-promise.json` or server logs), not from the Client API `/next` ack — see *Direct A2A Server invoke* below.
6. Do **not** treat “I sent one `/next`” as done; parity with the web UI is **next + poll until settled**.

### Local LLM upstream is generating — pause other work

See the [AGENTS.md](../AGENTS.md) *Common Issues* section for Local LLM upstream handling and debugging stuck pipelines.

**Hub ticket stuck in `error` (ai-integration, port 11434):** `GET /promises/pending` only lists **pending** work. List failures with **`GET /promises/errors`**, then **`POST /promise/{id}/retry`** and **`POST /promise/{id}/execute`**, or **`DELETE /promise/{id}`** to drop the ticket — [`ai-integration/docs/api-reference/PROXY_API.md`](../ai-integration/docs/api-reference/PROXY_API.md) § *Promise queue (hub tickets)*. From the Client API origin (default **`http://localhost:5173`**): same paths under **`/api/a2a/hub/...`** (proxy to `AI_HUB_URL`).

Narrative table of common “why iteration stopped” traps and mitigations (IDE vs driver): root **`AGENTS.md`** → *Why iteration stops (misreads and mitigations)*.

**Why this is easy to miss:** Three processes are all called “server” in conversation — **Vite+Client API** (sessions), **standalone SDK** (same contract, optional port), **A2A Server** (invoke only). **Agent** is not `?mode=agent`; it is whatever the session’s **`context.execution`** / workbench shows after your Client API calls. Canonical table and full explanation: root **`AGENTS.md`** → *Sessions, tests, and agent mode*.

## Direct A2A Server invoke (debug-only fallback)

**Not a normal operating mode.** This bypasses the Client API session layer (persistence, step folders, projections) and is only for **isolating protocol/schema problems** when you already have a server `promiseId` and the Client API is failing to surface it.

Prefer:
- **Client API session flow**: `POST /api/a2a/sessions` → `POST /next` → poll `GET /async`
- **Direct-tests entry points**: `tests/direct-tests/README.md` (schema debugging start point)

When you must debug a stuck `promiseId`, poll the A2A Server directly:

```bash
# 1. Set PROMISE_ID from server-promise.json or server logs — Client API /next ack does not include it
PROMISE_ID="prom_XXX"

# 2. Poll server directly
curl http://localhost:3000/api/v1/requests/$PROMISE_ID/result
# Returns: {"execute":{"form":{...}}, "context":{...}}
```

---

## Stability (where to invest)

Flaky or vague agent behavior is addressed mainly **inside the system**, not by micromanaging one-off queues:

- **Server prompts and transforms** — `a2a-server/prompts/` (e.g. `dialog-request.md`, `agent-request.md`, `router-request.md`), plus pipelines under `a2a-server/prompts/transforms/`.
- **Gray Room / interrupt behavior** — `a2a-server/docs/GRAY-ROOM.md`, orchestration code under `a2a-server/src/`.
- **Operator** uses the **Task Monitor** or **curl** to **verify** end-to-end behavior. **Not sufficient:** health + a single happy-path `sessions` → `next` → `async`. **Normative checklist:** [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) (session artifacts, ack/async, **Red Room** tool cycle when the task calls for it). **Indexed prompts + live stack:** [`prompts-to-agent-mode/README.md`](../prompts-to-agent-mode/README.md) and [`prompts-to-agent-mode/STACK-RUN.md`](../prompts-to-agent-mode/STACK-RUN.md). **Automated dialog driver:** [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md). **Full-spectrum loop (daemon + hooks):** [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md).
- **Operator** uses the **Task Monitor** or **curl** to **verify** end-to-end behavior. **Not sufficient:** health + a single happy-path `sessions` → `next` → `async`. Acceptance/closure gate source of truth: [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](OPERATOR-MONITOR-MANUAL-QA.md). Deep API verification details stay in [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md). Indexed prompts + live stack: [`prompts-to-agent-mode/README.md`](../prompts-to-agent-mode/README.md), [`prompts-to-agent-mode/STACK-RUN.md`](../prompts-to-agent-mode/STACK-RUN.md), [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md), [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md).

## Relation to `docs/WORKFLOW.md`

`WORKFLOW.md` describes the **logical** pipeline (Client API ↔ Server ↔ LLM). This document fixes the **operator interface**: **HTTP + curl**, human or Cursor, **not** the browser as the control plane.

---

## Do not use direct `POST /api/v1/invoke` for operator runs

Calling `POST http://localhost:3000/api/v1/invoke` directly is useful for **server-only** debugging, but it is outside the repo’s normative “drive the stack like the UI” flow.

If you need an automated repro, prefer adding or extending a runner under `tests/direct-tests/` that uses the **Client API session flow**. Keep direct-invoke usage as a last resort for isolating server behavior from session storage/projection bugs.
