# Operating the agent with curl (human or Cursor)

This repository **is** the agent stack: services run, and **work is driven by HTTP**, not by clicking the web UI. Treat the flow like a person **sending a message and waiting for a reply**—the same steps are copy-paste **instructions for Cursor** (terminal commands).

## What the operator does *not* do

- **Not** the primary path: open the browser and use the Vite UI to drive sessions.
- **Not** the stability strategy: maintain a parallel “task ticket” ritual in `tasks/` instead of fixing **system** behavior.

## What the operator *does* do

1. **Start services** (your usual scripts: e.g. `start-all.bat` or per-service starters).
2. **Talk to the Client API** on the dev server base URL (default **`http://localhost:5173`**) — same API the UI uses, but **via `curl`** (or any HTTP client).
3. **Wait for completion** on async work: poll **`GET /api/a2a/sessions/{id}/async`** (or legacy promise URL) until the response is final — same as a user waiting for an answer.

Full endpoint table: root **`AGENTS.md`** (Client API section).

## Minimal mental model

| Step | Meaning |
|------|--------|
| Create session | `POST /api/a2a/sessions` |
| Send user turn | `POST /api/a2a/sessions/{id}/next` with body your app expects |
| Wait / fetch result | `GET .../async` (repeat until done) |

Exact JSON shapes depend on your client payload conventions; use an existing session capture under `a2a-client/storage/sessions/` as a template if needed.

## Stability (where to invest)

Flaky or vague agent behavior is addressed mainly **inside the system**, not by micromanaging one-off queues:

- **Server prompts and transforms** — `a2a-server/prompts/` (e.g. `dialog-request.md`, `agent-request.md`, `router-request.md`), plus pipelines under `a2a-server/prompts/transforms/`.
- **Gray Room / interrupt behavior** — `a2a-server/docs/GRAY-ROOM.md`, orchestration code under `a2a-server/src/`.
- **Operator** uses **curl** to **verify** end-to-end behavior after changes (health + session flow).

## Relation to `docs/WORKFLOW.md`

`WORKFLOW.md` describes the **logical** pipeline (Client API ↔ Server ↔ LLM). This document fixes the **operator interface**: **HTTP + curl**, human or Cursor, **not** the browser as the control plane.
