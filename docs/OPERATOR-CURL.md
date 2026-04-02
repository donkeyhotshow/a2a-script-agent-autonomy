# Operating the agent with curl (human or Cursor)

## Instrument: launch tasks through session dialog

**Normative automation for indexed backlog tasks:** use the **Task Monitor** — same **Client API session dialog** as the web UI (`POST /sessions` → `/next` → poll `/async`, router beats). Operator doc: **[`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md)** (`npm run monitor`, `npm run monitor:once`, `TASK_MONITOR_*`, `ErrorClassifier` + direct-tests on failure). Full IDE + daemon loop narrative: **[`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md)**.

**Manual operator (curl / script):** same HTTP contour as the monitor — you are the driver; the monitor is a scripted driver. Both are **not** `POST /api/v1/invoke` alone.

## Sub-agent framing

Treat the **running A2A stack** as a **sub-agent**: a headless agent you call over **HTTP** (Client API). The **primary agent** is whoever sits in the **IDE** (e.g. Cursor): they reason, run the **Task Monitor** or **`curl`**, edit code. The sub-agent does **not** share the IDE’s context—it only sees what you send in the request body and returns structured **execute/result/context** (after polling async if needed).

Same mental model as “user types, waits for answer”—except the “user” may be the IDE agent with **`curl`**, or **`monitor-and-process-tasks.js`** driving the same endpoints.

---

This repository **is** that stack: services run, and **work is driven by HTTP** (Client API sessions), not by the browser as the default control plane.

**Orchestration for backlog prompts** = **Task Monitor** + optional IDE follow-up on **`hooks/`** — see [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md). **One-off verification** = **`curl`** (or any HTTP client) on the same paths.

## What the operator does *not* do

- **Not** the default: open the browser and use the Vite UI as the only way to drive sessions (UI is valid; docs target **API + monitor**).
- **Not** the stability strategy: maintain a parallel “task ticket” ritual in `tasks/` instead of fixing **system** behavior.
- **Not** treat `POST :3000/api/v1/invoke` as the primary way to “run agent tasks” — that bypasses session storage and the dialog contour.

## What the operator *does* do

1. **Run services** from repo root: **`start-all.bat`** / **`start-all.sh`** — [`docs/SYSTEM_STARTUP.md`](SYSTEM_STARTUP.md).
2. **Launch indexed tasks through dialog:** **`npm run monitor`** or **`npm run monitor:once`** — [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md).
3. **Or talk to the Client API** directly (default **`http://localhost:5173`**) — same API the UI and monitor use, via **`curl`** or scripts.
4. **Wait for completion** on async work: poll **`GET /api/a2a/sessions/{id}/async`** until the response is final — same loop the Task Monitor implements.

## Schema debugging first step (mandatory)

Before session-level or e2e debugging, reproduce schema/shape problems in `scripts/direct-tests`.

Escalation order:
1. `scripts/direct-tests` (fast isolation of schema/action-key shape)
2. Client API session flow (`/sessions` -> `/next` -> `/async`)
3. Simulations (`sim:lint`, `sim:validate`)
4. Full stack/e2e

Full endpoint table: root **`AGENTS.md`** (Client API section).

## Web access and a2a-server

For **web** (browser), HTTP goes to the **same origin as the Vite app** — **`/api/a2a/*`** (Client API). The browser does **not** call `http://localhost:3000` directly.

Under that surface, work is still executed by **a2a-server**: the Client API forwards to **`POST {A2A_SERVER_URL}/api/v1/invoke`** and polls **`GET …/api/v1/requests/{promiseId}/result`** (or equivalent) while persisting sessions and projecting responses for the UI. So the **protocol and LLM pipeline** are **a2a-server**; the **session and operator-facing HTTP** for web and curl are **Client API**.

See also: [`a2a-client/docs/WEB_UI_PROTOCOL.md`](../a2a-client/docs/WEB_UI_PROTOCOL.md) (async polling matrix).

## Minimal mental model

| Step | Meaning |
|------|--------|
| Create session | `POST /api/a2a/sessions` (optional `task`, `mode`, `projectId`, …) |
| First user turn | Usually **free text** — direction of work: `POST …/next` with `result.message` **or** shorthand `{ "task": "<natural language>" }` when the session is **not** showing router **choices** |
| Router turn | When `GET …/sessions/{id}` shows `execute.form.choices`, next `POST …/next` must send **`result.choice`** = a choice **`id`** (shorthand: `{ "task": "<choice id>" }` — same field name, different meaning) |
| Wait / fetch result | `GET .../async` (repeat until done); hydrate session between turns if unsure |

Exact shapes: root **`AGENTS.md`** → *Unified manual path* → *Router dialog (two beats)*; fallback router **`id`** values: **`dialog`**, **`agent`**, **`task-decomposition`** — [`shared/router-static-choices.json`](../shared/router-static-choices.json). Or copy a capture under `a2a-client/storage/sessions/`.

## Driver checklist (anti-stop)

Use this as a **literal** loop for curl or scripts so a low-context prompt does not become a single-shot HTTP trace.

1. **`POST /api/a2a/sessions`** — optional: `mode: "agent"`, `task`, `projectId` (see root **`AGENTS.md`**).
2. **`GET /api/a2a/sessions/{id}`** — if `execute.form.choices` → next body uses **`result.choice`** (or `{ "task": "<id>" }`); else **`result.message`** / `{ "task": "<free text>" }`.
3. **`POST /api/a2a/sessions/{id}/next`** with the body from step 2.
4. **`GET /api/a2a/sessions/{id}/async`** — repeat until not pending / you have a settled `execute` (re-**GET session** if ambiguous).
5. If still stuck, re-run step 2; if Client API returns empty execute but you have `promiseId`, see *Direct A2A Server invoke (workaround)* below.
6. Do **not** treat “I sent one `/next`” as done; parity with the web UI is **next + poll until settled**.

### Ollama is generating — pause other work

When **`GET …/async`** keeps `asyncPending` (or **`GET …/api/v1/requests/{promiseId}/result`** returns `"status":"processing"`), the chain is often **waiting on Ollama** (via ai-integration). **Do not** immediately restart the stack or assume a bug.

1. **Confirm** a run is in progress: Ollama logs, **`GET http://localhost:11435/api/ps`** (running models when supported), host CPU/GPU activity, ai-integration / proxy logs (e.g. under `ai-integration/proxy_logs/` when enabled).
2. **After** that, **stop disruptive actions** until the call finishes: no **`kill-all` / `start-all`**, no extra heavy parallel sessions on the **same** Ollama, no extra `/next` spam on the same session unless you mean to replace or cancel work.

If Ollama is **idle** but status stays `processing`, treat it as a **stuck** pipeline — debug per root **`AGENTS.md`** → *Common Issues* and *Debugging*.

Narrative table of common “why iteration stopped” traps and mitigations (IDE vs driver): root **`AGENTS.md`** → *Why iteration stops (misreads and mitigations)*.

**Why this is easy to miss:** Three processes are all called “server” in conversation — **Vite+Client API** (sessions), **standalone SDK** (same contract, optional port), **A2A Server** (invoke only). **Agent** is not `?mode=agent`; it is whatever the session’s **`context.execution`** / workbench shows after your Client API calls. Canonical table and full explanation: root **`AGENTS.md`** → *Sessions, tests, and agent mode*.

## Direct A2A Server invoke (debug-only fallback)

**Not a normal operating mode.** This bypasses the Client API session layer (persistence, step folders, projections) and is only for **isolating protocol/schema problems** when you already have a server `promiseId` and the Client API is failing to surface it.

Prefer:
- **Client API session flow**: `POST /api/a2a/sessions` → `POST /next` → poll `GET /async`
- **Direct-tests entry points**: `scripts/direct-tests/README.md` (schema debugging start point)

When you must debug a stuck `promiseId`, poll the A2A Server directly:

```bash
# 1. After /next returns promiseId
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

## Relation to `docs/WORKFLOW.md`

`WORKFLOW.md` describes the **logical** pipeline (Client API ↔ Server ↔ LLM). This document fixes the **operator interface**: **HTTP + curl**, human or Cursor, **not** the browser as the control plane.

---

## Do not use direct `POST /api/v1/invoke` for operator runs

Calling `POST http://localhost:3000/api/v1/invoke` directly is useful for **server-only** debugging, but it is outside the repo’s normative “drive the stack like the UI” flow.

If you need an automated repro, prefer adding or extending a runner under `scripts/direct-tests/` that uses the **Client API session flow**. Keep direct-invoke usage as a last resort for isolating server behavior from session storage/projection bugs.
