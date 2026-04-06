# BREAK_STATE — live failure & evidence (not the task queue)

**Purpose:** When something **does not work** (you said it or an agent finds it), record **symptoms + paths + IDs** here first. **Do not** use this file as the authoritative work queue — that stays [`work/STATE.md`](work/STATE.md) and [`DEV_STATE.md`](DEV_STATE.md). After fix, **prune** resolved rows and optionally add a one-liner to `DEV_STATE.md` *Fixed*.

**Agent rule:** If the user reports breakage **or** investigation turns up a reproducible fault, **write or update** this file before large chat dumps. Prefer **concrete paths** over prose.

---

## Doc ↔ code drift — finding non-obvious gaps

Use this **over several passes** (sessions or hours). Goal: behavior **described in docs** but **missing, partial, or contradicted** in code — especially recovery paths, env flags, and cross-service contracts (Client API → server → proxy).

### Iteration 1 — Freeze the claim

1. Pick a **normative** doc (uses *must* / *must not* / *should*, tables of env vars, or state machines): e.g. [`docs/PROMISE-RETRY-DIALOG.md`](docs/PROMISE-RETRY-DIALOG.md), [`a2a-server/docs/GRAY-ROOM.md`](a2a-server/docs/GRAY-ROOM.md), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md) (*Unified manual path*, router two beats), [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md), ADRs under [`docs/adr/`](docs/adr/).
2. For each claim, write **one line**: *If X then Y* + **file:section** (so it can be falsified).
3. Drop claims that are purely narrative; keep **testable** ones (payload shape, retry policy, strip list, phase names).

### Iteration 2 — Map claim → choke point

1. Classify: **client** (`a2a-client/packages/vite-plugin/…`), **server** (`a2a-server/src/services/…`, `invoke.service.ts`, `request-processor*.ts`), **transforms** (`a2a-server/src/transform/…`), **proxy** (`ai-integration/proxy/…`).
2. Find the **single best entry** (the function that first applies the rule). Grep **distinct terms** from the doc (env names, JSON keys, log tags like `[GrayRoom]`, `requestPhase` values).
3. If grep hits **only** docs or tests, flag **implementation gap** until you find runtime code.

### Iteration 3 — Happy path + failure path

1. Walk the **success** branch from that entry (e.g. dialog → `executeLlmCall` → `pollReadyThenFetch` → gray room).
2. Walk **one** failure/recovery branch: deferral (`shouldDeferDialogProcessorFailure`, `scheduleRetry`), **recovery** (`recoverDialogFromLlmPromise`, `recoverProcessingRequests`), **restart** (stuck `processing` + `llmPromiseId`).
3. Ask: does the **doc claim still hold** on the failure branch? (Many drifts live here — e.g. extra LLM work after hub completion, or resubmit instead of wait.)

### Iteration 4 — Automated contradiction sweep

Run from repo root where applicable; read output as **suspects**, not truth.

| Focus | Where |
|--------|--------|
| Execute/result shape, LLM bodies | [`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md) — `scan-promise-bodies`, `scan-session-responses`, `check-llm-execute-shape`, `verify:gray-room` |
| Golden sim contract | `npm run sim:lint -- --all`, `npm run sim:validate -- --all` |
| MD/JSON mirror drift | `npm run sim:check-md` (see root / a2a-server package scripts) |

Compare: **validators** that exist only as **CLI** vs **runtime** checks in `transform-execute-validator.ts` — runtime may omit what docs assume is enforced everywhere ([`DEV_STATE.md`](DEV_STATE.md) *Extended deep search findings* pattern).

### Iteration 5 — Artifact archaeology (live or saved)

1. **Server row:** `a2a-server/storage/requests/prom_*.json` — `context.requestPhase`, `llmPromiseId`, `hubLlmResubmitCount`, `retryCount` / `retryAfter`. Match transitions to [`llm-orchestration.ts`](a2a-server/src/services/core/request-processor/llm-orchestration.ts) and deferral docs.
2. **Hub:** `ai-integration/proxy_logs/promises/<id>/` + `GET /promise/<id>` semantics in [`promise_api_routes.py`](ai-integration/proxy/promise_api_routes.py) vs server [`llm-hub-poll.ts`](a2a-server/src/daemon/llm-hub-poll.ts).
3. **Client session step:** `a2a-client/storage/sessions/<sess>/<n>/` — `server-response.json` vs `server-promise.json`; compare to [`WEB_UI_PROTOCOL.md`](a2a-client/docs/WEB_UI_PROTOCOL.md) / router rules in `AGENTS.md`.

### Iteration 6 — Tests as a weak spec

1. Grep **doc keywords** under `a2a-server/tests`, `a2a-client/tests`, `tests/direct-tests`. No hits → **high risk** for “documented but not locked”.
2. If a test **mocks** the hub/proxy, check whether the real integration path (polling, recovery, body shape) is still covered elsewhere.

### Red flags (quick)

- Doc says **must not** create/spam/retry, but code **increments a counter** or **loops POST** without a matching guard.
- Same **env var** documented in two places with **different defaults** or meaning.
- **Two layers** implement the same policy (client + server) — verify **both** or document *single source of truth*.
- `requestPhase` or hub status **stuck** while another subsystem reports **done** → cross-layer contract bug (log inc-* in [Evidence log](#evidence-log-append-newest-at-top)).

When you confirm a drift: add an **inc-*** block above, fix or file a task in [`work/STATE.md`](work/STATE.md), and update the **normative** doc if the code is intentionally different.

### Worked example — `POST /api/a2a/sessions` (Client API)

| Step | What to do |
|------|------------|
| **1 — Claims** | [`AGENTS.md`](AGENTS.md) *Unified manual path*: create session with optional `task`, **`mode`** or **`execution`**, `projectId` / `projectRoot`. [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) table: same + `llmModel`. Testable: response must support the same **operator flow** as `GET …/sessions/:id` (stage, async hints). |
| **2 — Code** | [`sessionRoutes.js`](a2a-client/packages/vite-plugin/routes/sessionRoutes.js) — `buildNewSessionFromRequest` → [`pickInitialExecution`](a2a-client/packages/vite-plugin/routes/utils/session-create-initial.js); `toPublicSession(session, true)` on create vs `false` on legacy `task-add` / `task-execute`. |
| **3 — Drift found** | `includeContext=true` was a raw `{...session}` spread: **no `stage`**, unlike every `GET`-style projection (`includeContext=false`). Create response and list/detail responses could disagree for the same logical state. **Fixed:** `toPublicSession` debug branch now sets `stage`, `asyncPending`, `promiseStatus` like the public path ([`session-projection-dto.js`](a2a-client/packages/vite-plugin/routes/utils/session-projection-dto.js)). |
| **4 — Doc follow-up** | **Done:** [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) § *`POST /api/a2a/sessions` body* — `mode` vs `execution`, fallback to `task`/`new`, legacy aliases, bootstrap `execute` vs [`simulations/SCHEMA.md`](simulations/SCHEMA.md) action-key. |

### Worked example — `POST …/sessions/:id/next` → invoke sanitization

| Step | What to do |
|------|------------|
| **1 — Claims** | [`AGENTS.md`](AGENTS.md) *Invoke payload privacy*: storage `sessionId` / `projectId` stay client-side; server gets `context.session_id` only as **`srv_sess_*`** from its own responses. |
| **2 — Code** | [`mergeContext`](a2a-client/packages/vite-plugin/routes/context-processor.js) adds `sessionId` / `project` fields → [`prepareServerRequest`](a2a-client/packages/vite-plugin/routes/context-processor.js) → [`http-invoker.js`](a2a-client/packages/vite-plugin/routes/http-invoker.js) `POST /api/v1/invoke`. Shared strip: [`a2a-invoke-builders.mjs`](a2a-client/shared/a2a-invoke-builders.mjs). |
| **3 — Drift found** | `prepareServerRequest` only ran `sanitizeContextForServer` on `context`; top-level body keys were not passed through `sanitizeInvokeBodyForA2aUpstream` (SDK already did). Low risk today (body shape is `{ context, result, task? }`; no `sync`) but **not parity** if top-level client keys are added later. **Fixed:** return `sanitizeInvokeBodyForA2aUpstream(requestToServer)` from `prepareServerRequest`. |
| **4 — Doc follow-up** | **Done:** [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) § *Invoke sanitization* — table of stripped fields + file pointers. |

### Worked example — `GET …/sessions/:id/async` vs `WEB_UI_PROTOCOL.md`

| Step | What to do |
|------|------------|
| **1 — Claims** | [`WEB_UI_PROTOCOL.md`](a2a-client/docs/WEB_UI_PROTOCOL.md): web polls `/async`; no transport id in body; semantic `asyncPending` + related flags. |
| **2 — Code** | [`step-routes-async-flow.js`](a2a-client/packages/vite-plugin/routes/step-routes-async-flow.js) — `includePromiseIdInBody: false` for `/async`; payload built after `normalizePromisePollStatus` ([`client-api-envelope.mjs`](a2a-client/shared/client-api-envelope.mjs)). |
| **3 — Drift found** | Lifecycle diagram and matrix text said **`promiseStatus`** on `/async` body; implementation uses **`status`** (server request row), plus `requestPhase` / `retryAfter` / projected `execute`. **Idle** path returns `status: "idle"` without `execute`. |
| **4 — Doc follow-up** | **Done:** `WEB_UI_PROTOCOL.md` — HTTP table row expanded; diagrams fixed; new § *GET `/async` response shape* (idle vs poll vs legacy); matrix row clarified vs `GET /sessions/:id`. |

### Worked example — Router two beats + `GET …/messages`

| Step | What to do |
|------|------------|
| **1 — Claims** | Docs describe `form.choices` and `task`↔`choice` shorthand; web polls/messages for UI. |
| **2 — Code** | [`routerFormHasChoices`](a2a-client/packages/vite-plugin/routes/step-routes-router-flow.js) (`choices` **or** `form.meta.routerChoices`); [`buildSubmitResult`](a2a-client/packages/vite-plugin/routes/step-routes-router-flow.js); [`normalizeRouterStepSubmit`](a2a-client/packages/vite-plugin/routes/step-routes-router-flow.js) after build; [`sessionRoutes.js`](a2a-client/packages/vite-plugin/routes/sessionRoutes.js) `GET …/messages` (404 in **project** storage). |
| **3 — Drift found** | **`meta.routerChoices`** and **localized router normalization** were implemented but not in operator/web protocol prose. **`GET /messages`** query/response and **project-mode 404** were undocumented. |
| **4 — Doc follow-up** | **Done:** [`WEB_UI_PROTOCOL.md`](a2a-client/docs/WEB_UI_PROTOCOL.md) — router § expanded; new § *GET `/messages`*; HTTP table row. [`OPERATOR-CURL.md`](docs/OPERATOR-CURL.md) router table row. |

### Worked example — Vite `POST /api/a2a/.../next` vs SDK `POST /api/sessions/.../next`

| Step | What to do |
|------|------------|
| **1 — Claims** | [ADR-0028](docs/adr/ADR-0028-client-api-deployment-modes.md): SDK should match Vite **contract**; same invoke wire to a2a-server. |
| **2 — Code** | Shared: [`router-submit.mjs`](a2a-client/shared/router-submit.mjs), [`next-invoke-pipeline.mjs`](a2a-client/shared/next-invoke-pipeline.mjs), [`dialog-invoke-history.mjs`](a2a-client/shared/dialog-invoke-history.mjs). Vite: [`step-routes-dialog-flow.js`](a2a-client/packages/vite-plugin/routes/step-routes-dialog-flow.js) re-exports router helpers; [`context-processor.js`](a2a-client/packages/vite-plugin/routes/context-processor.js) re-exports pipeline. SDK: [`sessions-async.ts`](a2a-client/packages/sdk/src/server/server/routes/sessions-async.ts) loads prior step from `server-response.json` + runs same pipeline. |
| **3 — Residual drift** | **Fixed (request/ack):** `task` shorthand, router normalization, merge/sync flags, minimal ack. **Still differs:** Vite **project-mode** step parents vs SDK **`storage/sessions`** only; **`POST …/action`** on SDK remains a separate path. |
| **4 — Doc follow-up** | **Done:** ADR-0028, OPERATOR-CURL, SDK route JSDoc; this row updated 2026-04-06. |

### Worked example — `GET …/sessions/:id` + messages (Vite vs SDK)

| Step | What to do |
|------|------------|
| **1 — Claims** | Operators assume one Client API “shape”; ADR-0028 says same **wire** to a2a-server, path prefix may differ. |
| **2 — Code** | Vite `GET` → root `toPublicSession`; prod blocks `includeContext`; `GET …/messages` delta from `collectSessionMessagesFlat` (404 in **project** storage). SDK [`sessions-read.ts`](a2a-client/packages/sdk/src/server/server/routes/sessions-read.ts) → default **`{ success, session }`**; **`?unwrap=1`** → Vite-shaped root body; **`includeContext`** + prod **403**; **`GET …/messages`** → list envelope unless **`afterSeq`** query → same delta JSON as Vite (in-memory messages). |
| **3 — Residual drift** | Default SDK **envelope** without `unwrap=1`; **message source** (SDK in-memory vs Vite step merge); Vite **project-mode** messages delta **404**. |
| **4 — Doc follow-up** | **Done:** ADR-0028, OPERATOR-CURL, WEB_UI_PROTOCOL, SDK README table, package `index` exports `SessionManager` / `buildSessionGetQuery`; this row updated 2026-04-06. |

### Worked example — `POST …/next` ack: `promiseId` omitted (Vite)

| Step | What to do |
|------|------------|
| **1 — Claims** | [`WEB_UI_PROTOCOL.md`](a2a-client/docs/WEB_UI_PROTOCOL.md) listed `promiseId?` on ack; operators/curl comments said “after /next returns promiseId”. |
| **2 — Code** | [`toMinimalNextAck`](a2a-client/packages/vite-plugin/routes/utils/session-projection-dto.js) — `promiseId` only drives **`asyncPending`**, never serialized. SDK: [`buildMinimalNextAck`](a2a-client/packages/sdk/src/server/lib/session-routes-shared.ts) — same shape. |
| **3 — Drift found** | Docs implied Vite might echo transport id; **it does not** (by design, § *Transport ids stay server-side*). |
| **4 — Doc follow-up** | **Done:** WEB_UI_PROTOCOL table + lifecycle ack line; OPERATOR-CURL driver step 5 + Direct invoke bash comment; ADR-0028 ack bullet; JSDoc on `toMinimalNextAck` / SDK route. |

---

## Active incidents

| ID | Symptom (one line) | First seen | Status |
|----|--------------------|------------|--------|
| — | *none* | — | — |

*(Replace row: short `inc-YYYYMMDD-n` in Symptom column or add column if you use external tracker.)*

---

## Evidence log (append newest at top)

Template (copy block per incident):

```markdown
### inc-YYYYMMDD-n — <short title>

- **Symptom:**
- **Expected:**
- **Client API session folder:** `a2a-client/storage/sessions/<sess_…>/<step>/`
  - `client-result.json` / `request-to-server.json` / `server-response.json` / `server-promise.json`
- **Server / proxy logs:** `a2a-server/logs/`, `a2a-client/logs/`, `ai-integration/proxy_logs/promises/<id>/`
- **promiseId / request id:**
- **Hypothesis:**
- **Commands run:** (e.g. `npm run sim:validate -- --all`, `scan-session-responses`, unit path)
- **Resolution:** (when done: root cause + PR/commit ref; then remove from Active table)
```

### inc-2026-04-06-a — Hub promise “done” but server keeps `POST /api/chat` (`hubLlmResubmitCount` ↑)

- **Symptom:** Same `a2a-server/storage/requests/prom_*.json` row, no new server files; proxy shows completed promise bodies; `context.requestPhase: llm_error`, `hubLlmResubmitCount` growing.
- **Cause:** `GET /promise/:id/response` returned A2A- or provider-shaped JSON, not Ollama `{message:{content}}`. `fetchLlmResponse` returned null → `resolveLlmPromiseRecovery` → **resubmit** → `llmPromiseId` cleared → new hub chat each retry.
- **Fix:** [`a2a-server/src/daemon/llm-hub-poll.ts`](a2a-server/src/daemon/llm-hub-poll.ts) — `extractLlmTextFromHubResponseBody`: if Ollama extract is empty but body non-empty, pass **raw** text through. Tests: `tests/unit/llm-hub-poll.test.ts`.
- **Doc:** [docs/PROMISE-RETRY-DIALOG.md](docs/PROMISE-RETRY-DIALOG.md) § *Hub response body shape*.

### inc-2026-04-06-b — Recovery OK then ~180s fail: proxy `Read timed out` on Ollama :11435

- **Symptom:** `server.log`: `[ResponsePath] Recovery function failed` with `HTTPConnectionPool(host='localhost', port=11435): Read timed out. (read timeout=180)` during gray room; `context.requestPhase` stuck `llm_error`, high `retryCount`.
- **Cause:** After hub body was fetched, [`GrayRoomOrchestrator.runLoop`](a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts) still ran **ADR-0093 Internal Debate** (`llmService.debate` — **3×** sync hub/Ollama calls), replacing `md` before response transform.
- **Fix:** Run internal debate only when **`!isRecovered`** (recovery path passes `recovered: true` from [`response-path.ts`](a2a-server/src/services/core/request-processor/response-path.ts)).
- **Doc:** [a2a-server/docs/GRAY-ROOM.md](a2a-server/docs/GRAY-ROOM.md) § *Hub promise recovery*.

---

## Quick probes (no stack required where noted)

| Check | Command or path |
|-------|------------------|
| Schema / shape | [`tests/direct-tests/README.md`](tests/direct-tests/README.md), [`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md) |
| Sims | `npm run sim:lint -- --all` / `npm run sim:validate -- --all` (from repo root) |
| Gray room snapshot | `npm run verify:gray-room -- <snapshot.json>` |
| Full client+server+sim sweep | `npm run test:gang` (see [`PAPA-MAMA.md`](PAPA-MAMA.md)) |

---

*Last updated: 2026-04-06 — Vite /next ack omits promiseId; BREAK_STATE #7*
