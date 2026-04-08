# Running `prompts-to-agent-mode` against the live stack

Every markdown file in this directory is an **indexed task prompt**. That does **not** tell you *which runtime* to use by itself. This page fixes that.

**Stateful session, not a document POST:** The file content seeds **`task`** / agent instructions; **completion** requires **staying on the same `sessionId`** through **`/next`**, **`/async`**, and router **`choices`** until the flow is terminal. If you only “run the document” as one API call, you have not executed the task on the stack.

## Mandatory default: Task Monitor (same dialog as the UI)

To **execute** this folder on the live stack, use the Task Monitor — **not** ad-hoc curl for each file. It runs the full dialog (create session → `next` → poll `async` → router choices):

- **[`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md)** — `npm run monitor` / `npm run monitor:once`, env vars, failure hints, direct-tests, **promise-queue gate** when `PROMISE_DAEMON_ONLY` is on.
- Entry: [`monitor-and-process-tasks.js`](../monitor-and-process-tasks.js) (modules under [`tests/monitor-tasks/`](../tests/monitor-tasks/)).

Manual **curl** uses the **same** endpoints and beats for **one-off** repro; batch queue runs belong in the monitor.

## Two different uses of the same text

| You want to… | Use |
|--------------|-----|
| Edit the repo, run tests/sims, or drive Cursor | The **Agent prompt** section as instructions for that environment. |
| Exercise the **running** script-agent stack (same as the browser UI) | **Client API** on the Vite/dev app origin — **not** `POST /api/v1/invoke` on the server alone. |

If the task says “verify in the live system”, “E2E”, “session”, or “operator”, assume **Client API** unless the file explicitly says otherwise.

## Mandatory contour (live stack)

| Do **not** (misleading default) | Do this instead |
|--------------------------------|-----------------|
| `POST http://localhost:3000/api/v1/invoke` as the only step (debug-only; bypasses sessions) | `POST http://localhost:5173/api/a2a/sessions` (or your Client API base — see [ADR-0028](../docs/adr/ADR-0028-client-api-deployment-modes.md)) |
| Expect server-side session IDs from `:3000` | Session id from **Client API**; steps live under `a2a-client/storage/sessions/` |
| One HTTP call and stop | `POST …/sessions` → `POST …/sessions/{id}/next` → poll `GET …/sessions/{id}/async` (and `GET …/sessions/{id}` when debugging) |

Seed **agent pipeline** on create: body includes **`"mode": "agent"`** (or equivalent `execution` seed). **Agent mode is not a separate URL** — it is session `context`.

## Router (two beats)

After each response, inspect `execute.form`. **No `choices`** → next `/next` sends free text (`result.message` or top-level `task`). **`choices` present** → next `/next` sends **`result.choice`** (or `task` as the choice **`id`**). Full rules: [AGENTS.md](../AGENTS.md) → *Router dialog*.

## Minimal create (curl)

```http
POST /api/a2a/sessions HTTP/1.1
Host: localhost:5173
Content-Type: application/json

{
  "projectId": "default",
  "mode": "agent",
  "task": "<paste Agent prompt body or your task text>"
}
```

Then `POST /api/a2a/sessions/{id}/next` and poll `GET /api/a2a/sessions/{id}/async` as documented.

## Longer walkthroughs

- [MONITOR-QUICK-START.md](../MONITOR-QUICK-START.md) — instrument for dialog-based task launch
- [ONE-PIPELINE.md](ONE-PIPELINE.md) — linear env → API → observe → record
- [docs/OPERATOR-CURL.md](../docs/OPERATOR-CURL.md) — curl + mental model
- [AGENTS.md](../AGENTS.md) — *Unified manual path (Client API)*
- [a2a-client/docs/api-testing-plan.md](../a2a-client/docs/api-testing-plan.md)

Parent index: [README.md](README.md). Full backlog orchestration (daemon + hooks + IDE): [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md).
