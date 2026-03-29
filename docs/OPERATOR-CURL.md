# Operating the agent with curl (human or Cursor)

## Sub-agent framing

Treat the **running A2A stack** as a **sub-agent**: a headless agent you call over **HTTP** (Client API). The **primary agent** is whoever sits in the **IDE** (e.g. Kilo / Cursor): they reason, run `curl`, edit code. The sub-agent does **not** share the IDE’s context—it only sees what you send in the request body and returns structured **execute/result/context** (after polling async if needed).

Same mental model as “user types, waits for answer”—except the “user” is the IDE agent and the keyboard is **curl**.

Repo prompt that uses this wording (Russian): [`START-PROMPT-UNLIM.md`](../START-PROMPT-UNLIM.md).

---

This repository **is** that stack: services run, and **work is driven by HTTP**, not by clicking the web UI.

**Orchestration** = **IDE agent session** + terminal—not a dedicated “orchestrator script” in the repo.

## What the operator does *not* do

- **Not** the primary path: open the browser and use the Vite UI to drive sessions.
- **Not** the stability strategy: maintain a parallel “task ticket” ritual in `tasks/` instead of fixing **system** behavior.
- **Not** a separate repo script whose job is to loop subprocesses—that is **not** what “orchestrator” means in this project.

## What the operator *does* do

1. **Run services** however you already do (scripts, manual, compose—outside this doc’s scope).
2. **Talk to the Client API** on the dev server base URL (default **`http://localhost:5173`**) — same API the UI uses, but **via `curl`** (or any HTTP client).
3. **Wait for completion** on async work: poll **`GET /api/a2a/sessions/{id}/async`** (or legacy promise URL) until the response is final — same as a user waiting for an answer.

Full endpoint table: root **`AGENTS.md`** (Client API section).

## Minimal mental model

| Step | Meaning |
|------|--------|
| Create session | `POST /api/a2a/sessions` (optional `task`, `mode`, `projectId`, …) |
| First user turn | Usually **free text** — direction of work: `POST …/next` with `result.message` **or** shorthand `{ "task": "<natural language>" }` when the session is **not** showing router **choices** |
| Router turn | When `GET …/sessions/{id}` shows `execute.form.choices`, next `POST …/next` must send **`result.choice`** = a choice **`id`** (shorthand: `{ "task": "<choice id>" }` — same field name, different meaning) |
| Wait / fetch result | `GET .../async` (repeat until done); hydrate session between turns if unsure |

Exact shapes: root **`AGENTS.md`** → *Unified manual path* → *Router dialog (two beats)*; fallback router **`id`** values: **`dialog`**, **`agent`**, **`task-decomposition`** — [`shared/router-static-choices.json`](../shared/router-static-choices.json). Or copy a capture under `a2a-client/storage/sessions/`.

**Why this is easy to miss:** Three processes are all called “server” in conversation — **Vite+Client API** (sessions), **standalone SDK** (same contract, optional port), **A2A Server** (invoke only). **Agent** is not `?mode=agent`; it is whatever the session’s **`context.execution`** / workbench shows after your Client API calls. Canonical table and full explanation: root **`AGENTS.md`** → *Sessions, tests, and agent mode*.

## Stability (where to invest)

Flaky or vague agent behavior is addressed mainly **inside the system**, not by micromanaging one-off queues:

- **Server prompts and transforms** — `a2a-server/prompts/` (e.g. `dialog-request.md`, `agent-request.md`, `router-request.md`), plus pipelines under `a2a-server/prompts/transforms/`.
- **Gray Room / interrupt behavior** — `a2a-server/docs/GRAY-ROOM.md`, orchestration code under `a2a-server/src/`.
- **Operator** uses **curl** to **verify** end-to-end behavior after changes. **Not sufficient:** health + a single happy-path `sessions` → `next` → `async`. **Normative checklist:** [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) (session artifacts, ack/async, **Red Room** tool cycle when the task calls for it). Orchestrator-style prompts: [`START-PROMPT-UNLIM.md`](../START-PROMPT-UNLIM.md) → *Ручные испытания Client API*.

## Relation to `docs/WORKFLOW.md`

`WORKFLOW.md` describes the **logical** pipeline (Client API ↔ Server ↔ LLM). This document fixes the **operator interface**: **HTTP + curl**, human or Cursor, **not** the browser as the control plane.
