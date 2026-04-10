# API Testing Plan (Session + Red Room)

**Operators / LLM agents:** Do not report "full verification" after create + one `/next` + one `/async` only. Run **all** sections below through the **Minimal Acceptance Checklist** (or document what failed after deliberate extra turns). For **automated** session dialog over indexed tasks, use **[`MONITOR-QUICK-START.md`](../../MONITOR-QUICK-START.md)**; for contract details see [`AGENTS.md`](../../AGENTS.md) → *Unified manual path* and *Router dialog*. Copy-paste prompts aligned to §1–§5: [`prompts-to-agent-mode/README.md`](../../prompts-to-agent-mode/README.md) (`client-api-01` … `client-api-05`).

**Invalid report:** Any conclusion like "all steps completed" / "full manual verification" / "API works" without either (a) every checklist item below addressed with evidence, or (b) an explicit list of checklist items still not reproduced after **extra** `/next` turns aimed at tool `execute` — treat as **non-compliant**; revise the run, do not ship the summary.

## How to run verification (agent session)

- **Do** drive a real **agent** session through the **Client API** (same as the web UI contour): `POST /api/a2a/sessions` with **`mode: "agent"`** (or `execution.action: "agent"`) and a concrete **`task`**, then **`POST …/sessions/{id}/next`** and poll **`GET …/sessions/{id}/async`** until idle; hydrate with **`GET …/sessions/{id}`** as needed. Router two-beat rules: [`AGENTS.md`](../../AGENTS.md) → *Router dialog* and *Unified manual path*.
- **On errors or gaps:** add **testable** follow-ups under **`tasks/pending/`** and refresh **`DEV_STATE.md`** so **another** agent session (human or IDE) can execute them. Do not treat “keep debugging only inside the same session” as sufficient handoff when the finding is a product bug or missing coverage.

This plan verifies only:

1. Session artifact correctness
2. Ack-first flow
3. Async completion
4. Red-room auto-execution cycle

## Prerequisites

- Web UI Client API available at `http://localhost:5173/api/a2a`
- A2A server available at `http://localhost:3000`

## 1) Create Session

`POST /api/a2a/sessions`

Checks:

- Response includes `session.id`
- Step `1/` contains `server-response.json` and `messages.json`

## 2) Submit User Turn (Ack-First)

`POST /api/a2a/sessions/{id}/next`

Checks:

- Response is ack-first (`accepted`, `step`, `asyncPending` — no `promiseId` in ack body)
- Do not treat this response as final state

## 3) Resolve Final State

If `asyncPending=true`:

- Poll `GET /api/a2a/sessions/{id}/async` until complete

Then:

- Load `GET /api/a2a/sessions/{id}`
- Verify final `execute`, `context`, and merged messages are present

## 4) Verify Step Artifacts

For each completed step:

- `client-result.json` exists for user/tool input
- `request-to-server.json` exists before invoke
- `server-promise.json` exists only while async is pending
- `server-response.json` exists when step is finalized
- `messages.json` exists and is mergeable across steps

## 5) Red-Room Flow

Red Room is **one automatic client turn** after a tool `execute`. Operators must exercise **every stage** of that cycle (not stop after the first user message completes). Map to evidence on disk / `GET …/sessions/{id}`:

| # | Function (must verify or explain blockers) | Evidence |
|---|---------------------------------------------|----------|
| 1 | Server returns tool `execute` (client must run tool) | Prior step `server-response.json` with tool-shaped `execute` |
| 2 | Persist tool output | Next step `client-result.json` (action-key `result`) |
| 3 | Build invoke payload | Same step `request-to-server.json` before server returns |
| 4 | Submit follow-up | `POST …/next` ack + poll `/async` if `asyncPending` |
| 5 | Finalize | Same step ends with `server-response.json` (+ `messages.json`) |

When server asks client to execute a tool action:

1. Client writes tool output into next-step `client-result.json`
2. Client sends `POST /sessions/{id}/next`
3. Client follows ack -> async poll (if needed) -> `GET /sessions/{id}`
4. Finalized step contains `server-response.json`

**Getting to (1):** If the first user turn only returns `form` / dialog with no tool `execute`, send **additional** `/next` turns (new `task` / `result.message`) until the server emits a tool `execute`, or document that N turns still did not produce one.

Checks:

- Step numbering remains linear
- No missing artifacts in the red-room turn
- Reload can recover pending state from files

## 6) Failure Cases

- Missing `request-to-server.json` before invoke -> fail
- `server-promise.json` never replaced by `server-response.json` after completion -> fail
- Session endpoint returns stale state not matching latest finalized step -> fail
- Execute/result not in action-key shape -> fail

## Minimal Acceptance Checklist

- [ ] `/api/a2a/sessions` create/load works
- [ ] `/next` is ack-first
- [ ] `/async` resolves pending work
- [ ] Session rebuild matches highest finalized step
- [ ] Red-room cycle produces complete next-step artifacts
