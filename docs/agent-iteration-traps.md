# Why agent iteration stops (low-context prompts)

Repo norms that override the default “answer once and exit” habit live in [`AGENTS.md`](../AGENTS.md) (empty queue, vague prompts, router). This page lists **failure modes** and **mitigations** for two surfaces: **Cursor / IDE agents** and **Client API session drivers** (scripts, operators).

## Iterative runbook (practical)

Use this short loop on every cycle so work does not stall on vague prompts or pending async turns:

1. **Pick one concrete unit** — one task file, one failing test, or one session failure.
2. **Run one step end-to-end** — execute, verify (`tests`/`sim`/`/async`), and capture evidence.
3. **Classify failure by layer** — A (Client/session), B (server/contract), C (hub/provider).
4. **Apply one fix only** — avoid batching unrelated changes in the same loop.
5. **Re-run the same unit** — prove the fix changed behavior, not just code.
6. **Write state before next loop** — update `DEV_STATE` + next explicit action.

### Stop conditions (strict)

- **Allowed stop:** user acceptance, or blocker with evidence + owner + next experiment.
- **Not allowed stop:** empty queue, one-line prompt, or `/next` ack without settled `/async`.
- **Monitor rule:** one prompt per `monitor:once` run is acceptable; repeat loops until success or logged blocker.

### Evidence rule (mandatory)

- **Do not conclude from theory only.** Each loop must add at least one practical artifact: command output, session id + async status, test/sim result, or a concrete diff.
- **If practical evidence is missing, create it first.** Run a minimal experiment (single task, single endpoint, single failing test) and log the result before decisions.
- **Write evidence in state.** Add short proof lines to `DEV_STATE` (what was run, what changed, what failed/passed).
- **No evidence = no closure.** Treat evidence gaps as an open item, not as completion.

## 1. Misread of “done” or empty work

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 1 | **Empty queue = finish** | Treat empty `tasks/pending/` as **prune → discover → write**, then continue. See [`AGENTS.md`](../AGENTS.md) DEV_STATE Protocol; removed methodology mirror: [`tasks/brown-alert/archive-methodology-missing.md`](../tasks/brown-alert/archive-methodology-missing.md). | Same: driver does not “complete the repo”; human/agent loop owns queue. |
| 2 | **Vague prompt = one-shot** | Rule: continue until stated acceptance criteria or a **logged blocker**; define “done” (tests, checklist, files). | Scripts should have explicit exit conditions (step settled, max polls, error class). |
| 3 | **Silence / one-liner = stop** | [`AGENTS.md`](../AGENTS.md): minimal user text is **not** permission to halt after one turn. | N/A unless the driver stops on empty stdin—avoid that unless intentional. |

## 2. Session / router / API flow

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 4 | **Wrong beat after create** | After `POST /api/a2a/sessions`, inspect `GET …/sessions/{id}` (`includeContext=1` when debugging). First turn: **`result.message`** or top-level **`task`** as message; if `execute.form.choices` exists, send **`result.choice`** or **`task`** as choice **id**. See [`AGENTS.md`](../AGENTS.md) Router dialog, [`shared/router-static-choices.json`](../shared/router-static-choices.json). | Implement the same branch: read latest `execute.form` before each `next`. |
| 5 | **Polling not continued** | Async: `POST …/next` then poll `GET …/async` (and/or hydrate session) until settled. | Fixed retry budget + backoff; do not treat ack-only `next` as completion. |
| 6 | **Server-only invoke** | Do not drive **session** workflows with `POST /api/v1/invoke` alone; use Client API on `5173` (`/api/a2a/*`). See [`AGENTS.md`](../AGENTS.md) Unified manual path, [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md). | Always create session + `next` + poll on Client API base URL. |

### Task Monitor / daemon (self-upgrade)

| # | Trap | Mitigation |
|---|------|------------|
| 15 | **Router idle / “no result”** | `tests/monitor-and-process-tasks.js` auto-submits router **choice** in order **`agent` → `task-decomposition` → `dialog` → first** when needed; re-sends task text on idle task forms; completion path retries the same gate. |
| 16 | **Stale session id** | After storage prune, `GET /api/a2a/sessions/{id}` may return **404** — create a new session or re-run the monitor; old `promiseId` values are stale unless still valid on `:3000`. |
| 17 | **DELETE while async** | `DELETE /api/a2a/sessions/:id` returns **409** when flat or project storage has an in-flight promise (`getProjectModeInflightPromise`). |

**Client API:** one `GET /sessions/:id` handler so `?includeContext=1` is not shadowed by a branch that only returns messages.

## 3. Task and environment

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 7 | **Stack down / pending promise / restart during inference** | Retry with backoff; run health checks from [`AGENTS.md`](../AGENTS.md) Debugging. If status is `processing`, **confirm** Local LLM upstream is actually generating (e.g. `GET http://localhost:11435/api/ps`) **before** `kill-all` / `start-all` — [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md) → *Local LLM upstream is generating — pause other work*. | Same; log `promiseId` and poll until terminal state or timeout. If Local LLM upstream is idle but still `processing`, treat as **stuck** (same doc). |
| 8 | **Auth / env** | `JWT_SECRET` (32+ chars), `ENCRYPTION_KEY` exactly 32 chars, `SKIP_AUTH=1` in dev as documented. Fix env, retry—do not stop on first 401/400 without diagnosis. | Surface HTTP status and response body in logs. |
| 9 | **Started from sims/e2e for schema bug** | For schema/action-key shape failures, start at `tests/direct-tests` first, then escalate (session flow -> sims -> e2e). See [`AGENTS.md`](../AGENTS.md), [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md). | Same escalation order; avoid burning retries on high-latency e2e before direct reproduction. |

## 4. Model / behavior

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 10 | **Over-cautious “need more context”** | Default: state assumptions, proceed; ask only when blocked. | N/A (deterministic driver). |
| 11 | **Implicit one-response habit** | User/rules: iterate until criteria met. | Explicit loops and budgets in code. |
| 12 | **No written criteria** | Attach tests, sim commands, or checklist to the task. | Assertions on session JSON or exit codes. |
| 18 | **No practical evidence recorded** | Always attach at least one runtime/test artifact per loop; if none exists, run a minimal check and log it before closing. | Same: keep run id (`sessionId`/`promiseId`) + terminal status in output/state. |

## 5. Repo-specific process

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 13 | **DEV_STATE not updated** | Update root/module [`DEV_STATE.md`](../DEV_STATE.md) before/after work so the next pass sees real queue state. | Operators document runs in DEV_STATE when relevant. |
| 14 | **Golden sim / action-key shape** | One action key per `execute` / `result`; fix and re-run `npm run sim:lint` / `sim:validate`. See [`AGENTS.md`](../AGENTS.md) Golden Simulations, [`simulations/SCHEMA.md`](../simulations/SCHEMA.md). | Same for whoever edits sims or payloads. |

## Quick links

- [`DEV_STATE.md`](../DEV_STATE.md) — **Iterativity — full project normalization** (per-cycle conditions, normalization bar, legitimate stop)  
- [`AGENTS.md`](../AGENTS.md) — empty queue, router two beats, Client API path, checklist  
- [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md) — operator curl walkthrough; *Local LLM upstream is generating — pause other work*  
- [`tasks/brown-alert/archive-methodology-missing.md`](../tasks/brown-alert/archive-methodology-missing.md) — former `archive/methodology/tasks.md` links (removed tree)  
