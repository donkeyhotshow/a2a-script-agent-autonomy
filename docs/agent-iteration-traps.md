# Why agent iteration stops (low-context prompts)

Repo norms that override the default “answer once and exit” habit live in [`AGENTS.md`](../AGENTS.md) (empty queue, vague prompts, router). This page lists **failure modes** and **mitigations** for two surfaces: **Cursor / IDE agents** and **Client API session drivers** (scripts, operators).

## 1. Misread of “done” or empty work

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 1 | **Empty queue = finish** | Treat empty `tasks/pending/` as **prune → discover → write**, then continue. See [`AGENTS.md`](../AGENTS.md) DEV_STATE Protocol, [`methodology/tasks.md`](../methodology/tasks.md). | Same: driver does not “complete the repo”; human/agent loop owns queue. |
| 2 | **Vague prompt = one-shot** | Rule: continue until stated acceptance criteria or a **logged blocker**; define “done” (tests, checklist, files). | Scripts should have explicit exit conditions (step settled, max polls, error class). |
| 3 | **Silence / one-liner = stop** | [`AGENTS.md`](../AGENTS.md): minimal user text is **not** permission to halt after one turn. | N/A unless the driver stops on empty stdin—avoid that unless intentional. |

## 2. Session / router / API flow

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 4 | **Wrong beat after create** | After `POST /api/a2a/sessions`, inspect `GET …/sessions/{id}` (`includeContext=1` when debugging). First turn: **`result.message`** or top-level **`task`** as message; if `execute.form.choices` exists, send **`result.choice`** or **`task`** as choice **id**. See [`AGENTS.md`](../AGENTS.md) Router dialog, [`shared/router-static-choices.json`](../shared/router-static-choices.json). | Implement the same branch: read latest `execute.form` before each `next`. |
| 5 | **Polling not continued** | Async: `POST …/next` then poll `GET …/async` (and/or hydrate session) until settled. | Fixed retry budget + backoff; do not treat ack-only `next` as completion. |
| 6 | **Server-only invoke** | Do not drive **session** workflows with `POST /api/v1/invoke` alone; use Client API on `5173` (`/api/a2a/*`). See [`AGENTS.md`](../AGENTS.md) Unified manual path, [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md). | Always create session + `next` + poll on Client API base URL. |

## 3. Task and environment

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 7 | **Stack down / pending promise / restart during inference** | Retry with backoff; run health checks from [`AGENTS.md`](../AGENTS.md) Debugging. If status is `processing`, **confirm** Ollama is actually generating (e.g. `GET http://localhost:11435/api/ps`) **before** `kill-all` / `start-all` — [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md) → *Ollama is generating — pause other work*. | Same; log `promiseId` and poll until terminal state or timeout. If Ollama is idle but still `processing`, treat as **stuck** (same doc). |
| 8 | **Auth / env** | `JWT_SECRET` (32+ chars), `ENCRYPTION_KEY` exactly 32 chars, `SKIP_AUTH=1` in dev as documented. Fix env, retry—do not stop on first 401/400 without diagnosis. | Surface HTTP status and response body in logs. |
| 9 | **Started from sims/e2e for schema bug** | For schema/action-key shape failures, start at `scripts/direct-tests` first, then escalate (session flow -> sims -> e2e). See [`AGENTS.md`](../AGENTS.md), [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md). | Same escalation order; avoid burning retries on high-latency e2e before direct reproduction. |

## 4. Model / behavior

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 10 | **Over-cautious “need more context”** | Default: state assumptions, proceed; ask only when blocked. | N/A (deterministic driver). |
| 11 | **Implicit one-response habit** | User/rules: iterate until criteria met. | Explicit loops and budgets in code. |
| 12 | **No written criteria** | Attach tests, sim commands, or checklist to the task. | Assertions on session JSON or exit codes. |

## 5. Repo-specific process

| # | Trap | Cursor agent | Client API driver |
|---|------|----------------|-------------------|
| 13 | **DEV_STATE not updated** | Update root/module [`DEV_STATE.md`](../DEV_STATE.md) before/after work so the next pass sees real queue state. | Operators document runs in DEV_STATE when relevant. |
| 14 | **Golden sim / action-key shape** | One action key per `execute` / `result`; fix and re-run `npm run sim:lint` / `sim:validate`. See [`AGENTS.md`](../AGENTS.md) Golden Simulations, [`simulations/SCHEMA.md`](../simulations/SCHEMA.md). | Same for whoever edits sims or payloads. |

## Quick links

- [`AGENTS.md`](../AGENTS.md) — empty queue, router two beats, Client API path, checklist  
- [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md) — operator curl walkthrough; *Ollama is generating — pause other work*  
- [`methodology/tasks.md`](../methodology/tasks.md) — task wording and queue protocol  
