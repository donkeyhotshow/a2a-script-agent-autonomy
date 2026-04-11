# Web UI ↔ Client API protocol (agent)

Checkpoint: agent mode in `a2a-client/web` against the Vite **storage-mode** Client API (`/api/a2a/*`).

**Web HTTP surface:** the browser only sees **`/api/a2a/*`** on the app origin. **Execution** still runs on **a2a-server** (`/api/v1/invoke` and request polling); the Client API is the gateway and session layer. Operator doc: [`docs/OPERATOR-CURL.md`](../../docs/OPERATOR-CURL.md) → *Web access and a2a-server*.

**AI hub promise queue (vertex C):** same-origin **`/api/a2a/hub/*`** proxies to **`AI_HUB_URL`** (pending/errors/retry/execute/delete). Web header **Hub queue**; normative hub API: [`a2a-ai-hub/docs/api-reference/PROXY_API.md`](../../a2a-ai-hub/docs/api-reference/PROXY_API.md) § *Promise queue*.

## Principles

1. **Transport ids stay server-side** — The browser does not need A2A `promiseId` to poll. The Client API resolves the active in-flight step and calls A2A internally.
2. **Web state is semantic** — UI and `SessionStore` react to `asyncPending`, `promiseStatus`, projected `execute`, `messages`, and loader flags, not to opaque backend ids.
3. **Ack + hydrate** — `POST .../next` returns a minimal ack; full state comes from `GET .../sessions/:id`.
4. **Canonical + projection split** — step files stay canonical; API response for web uses a deterministic UI projection.

## Router dialog (two beats)

Task-flow is **not** one shot: (1) user submits **direction of work** (free text in `execute.form.input` / first `POST .../next` as `result.message` or shorthand `task`). (2) After `invoke`, the server often returns **`execute.form.choices`**; the UI renders **buttons** (`task-flow/render-form.js` — types such as `agent`, `dialog`, `decomposition`). The next submit sends **`result.choice`** = the chosen row’s **`id`** (same `task` field is overloaded as choice id when the prior step had choices — see `packages/vite-plugin/routes/step-routes-router-flow.js` `buildSubmitResult`). Coarse stage **`routing`** when choices exist: `packages/vite-plugin/routes/utils/session-stage-machine.js`. Default server fallback choice **`id`** values: **`dialog`**, **`agent`**, **`task-decomposition`** — see repo root [`shared/router-static-choices.json`](../../shared/router-static-choices.json). Operators and methodology: root [`AGENTS.md`](../../AGENTS.md) (*Router dialog (two beats)*), [`docs/OPERATOR-CURL.md`](../../docs/OPERATOR-CURL.md).

**Choice detection (must match `/next`):** the Client API treats the prior step as “has choices” when **`execute.form.choices`** is a non-empty array **or** **`execute.form.meta.routerChoices`** is (same as [`routerFormHasChoices()`](../packages/vite-plugin/routes/step-routes-router-flow.js) and [`deriveSessionStage()`](../packages/vite-plugin/routes/utils/session-stage-machine.js)). Server goldens usually use `choices`; either form is valid for the web contour.

**Router step normalization:** when `context.execution.step === 'router'`, [`normalizeRouterStepSubmit()`](../packages/vite-plugin/routes/step-routes-router-flow.js) maps free-text **`task`** / **`result.message`** (and some **`result.choice`** variants) to canonical ids — e.g. Ukrainian/Russian/English labels such as **діалог** / **диалог** → `dialog`, **агент** → `agent`, **декомпозиція** → `task-decomposition`, in addition to matching a real choice **`id`** from the form.

## Glossary (one term each)

| Term | Meaning |
|------|---------|
| **Web DTO** | Payload from `GET /sessions/:id` after `toPublicSession`: projected `execute`, no raw tool keys; **`context` omitted** unless `?includeContext=1` (debug). |
| **Red Room** | Client-side label for **system-role** lines in the message timeline (auto tool summaries, RAG/read echoes). Same `history` roles as server: `user` / `assistant` / `system`. |
| **Gray Room** | Server-side interrupt loop (extra LLM/transform turns). **Control envelope** may appear in persisted `context.workbench.slots.grayRoom`; Web sees it only with `includeContext=1` or when the app reads internal session storage. UI may show a **Gray room** collapsible when `session.context` is hydrated (e.g. debug). |
| **Agent loop** | `execution.action === 'agent'` (or similar) with **single-key** `execute` per step: tools (`rag-search`, `read-file`, …) chained via `result` → next request. |

## `execute` shape for the browser (Web DTO)

`GET /api/a2a/sessions/{id}` (and related routes that use the public session DTO) return **projected `execute` for the UI**: raw protocol actions such as `rag-search`, `read-file`, `write-file`, `script`, `execute-command`, `list-directory`, `grep-search`, `file-exists`, `edit-patch`, and `run-script` are **removed** and replaced with:

- **`execute.message`** — status text (and optional **`execute.llmMessage`**).
- **`execute.form`** — unchanged when the server sent a form.
- **`execute.attachments`** — hints for the UI to reconstruct the activity log without raw protocol data.

### `execute.attachments` Fields

| Field | Type | Description |
|-------|------|-------------|
| `readFiles` | `Array<{path}>` | List of paths from `read-file` action |
| `writtenFiles` | `Array<{path}>` | List of paths from `write-file` action |
| `ragQuery` | `string` | The search query used in `rag-search` |
| `shellCommand` | `string` | The command string from `execute-command` |
| `listDirectoryPath`| `string` | The path from `list-directory` |
| `grepPattern` | `string` | Search pattern from `grep-search` |
| `pendingClientAction`| `string` | Label of the hidden action (`script`, `run-script`, etc.) |

The **server protocol** and simulation **`response.json`** still use a **single action key** under `execute`, and any **`result`** (if present) must follow the **action-key shape** (e.g., `{ "read-file": { ... } }`). Goldens for **`received.json`** match this projection DTO (see `simulations/SCHEMA.md`). With **`?includeContext=1`**, the session payload may include full internal `context` (including **`workbench.sections`**) for debugging; normal web flow should not depend on raw canonical keys.

## HTTP (storage mode)

| Method | Path | Role |
|--------|------|------|
| POST | `/api/a2a/sessions` | Create session |
| GET | `/api/a2a/sessions/{id}` | Authoritative snapshot: **body is the session DTO** (not `{ success, session }`). Messages merged from steps in storage mode; `asyncPending` / `promiseStatus` / `stage` via projection. `?includeContext=1` **403 in production** (Vite). Standalone SDK default **`{ success, session }`**; **`?unwrap=1`** matches Vite top-level body — [ADR-0028](../../docs/adr/ADR-0028-client-api-deployment-modes.md). |
| POST | `/api/a2a/sessions/{id}/next` | Submit user result; **ack JSON** (Vite + SDK): **`{ success, accepted, step, asyncPending }`** — transport **`promiseId` is not echoed**; use **`asyncPending: true`** then poll **`GET …/async`** ([ADR-0028](../../docs/adr/ADR-0028-client-api-deployment-modes.md)). |
| GET | `/api/a2a/sessions/{id}/async` | **Preferred for web:** one poll step for current async work; body has **no** `promiseId` (transport id stays server-internal). Semantic fields: **`asyncPending`**, **`status`**, optional projected **`execute`**, **`result`**, **`completed`**, **`requestPhase`**, **`retryAfter`** — see § *GET `/async` response shape* below. (`GET /sessions/:id` still exposes **`promiseStatus`** on the session object; do not confuse with this poll’s **`status`** string.) |
| GET | `/api/a2a/sessions/{id}/promise/{promiseId}` | Legacy/debug; same persistence side-effects as `/async` |
| GET | `/api/a2a/sessions/{id}/latest` | Step summary; nested `session` uses same public DTO as GET session |
| GET | `/api/a2a/sessions/{id}/messages` | Message delta + session flags — see § *GET `/messages`* (default **flat** storage only; **404** in **project** storage mode) |

## Lifecycle diagrams (web + storage)

### Happy path: create -> next -> async polling

```text
Web UI                   Client API routes                             Session storage writes/reads
------                   -----------------                             ----------------------------
create session
POST /sessions ------->  sessionRoutes:create                      ->  create `sessions/{sid}/`
GET  /sessions/{sid} <-  sessionRoutes:get                         <-  READ latest response + messages (if present)

send input
POST /sessions/{sid}/next
  ---------------------> stepRoutes:next
                         WRITE `{N}/client-result.json`
                         WRITE `{N}/request-to-server.json`
                         invoke A2A
                         async ? WRITE `{N}/server-promise.json`
                               : WRITE `{N}/server-response.json` + `{N}/messages.json`
<---------------------  ack `{ success, accepted, step, asyncPending }` (no `promiseId` on Vite)

while asyncPending=true
GET /sessions/{sid}/async
  ---------------------> stepRoutes:async
                         READ `{N}/server-promise.json`
                         pending ? keep file
                                 : DELETE promise + WRITE response/messages
<---------------------  `{ asyncPending, status, result?, execute?, completed, requestPhase?, retryAfter? }` (no `promiseId`; see § below)

hydrate UI
GET /sessions/{sid} ---> sessionRoutes:get
<---------------------  projected execute/messages/context
                         READ highest completed `server-response.json`
                         READ merged `{1..N}/messages.json`
```

### Recovery path: reload -> restore -> async resume

```text
Web UI reload            Client API/session load                         Session storage reads/writes
-------------            -----------------------                         ----------------------------
page reload ---------->  GET /sessions/{sid}
                         derive state from step artifacts
                         READ highest completed `{K}/server-response.json`
                         READ `{1..K}/messages.json`
<----------------------  returns session + `asyncPending` flag

if asyncPending:
resume poll ---------->  GET /sessions/{sid}/async
                         READ in-flight `{K+1}/server-promise.json`
                         if complete:
                           DELETE `{K+1}/server-promise.json`
                           WRITE  `{K+1}/server-response.json`
                           WRITE  `{K+1}/messages.json`
<----------------------  same poll shape as happy path (`status` = server row status, not session `promiseStatus`)

final restore -------->  GET /sessions/{sid}
<----------------------  stable snapshot for renderer/session store
```

### Async polling URL matrix (A2A Server, Vite Client API, SDK AsyncClient)

| Consumer | Base URL | Poll / status route | Full example URL | Notes |
|----------|----------|---------------------|------------------|--------|
| **A2A Server** (raw invoke result API) | `A2A_SERVER_URL` (e.g. `http://localhost:3000`) | `GET /api/v1/requests/:promiseId/result` | `http://localhost:3000/api/v1/requests/prom_123/result` | Canonical server async endpoint; promise-id based transport flow. |
| **Vite Client API / Web UI** (storage mode) | Browser origin + `/api/a2a` (e.g. `http://localhost:5173/api/a2a`) | Preferred: `GET /sessions/:sessionId/async`; legacy: `GET /sessions/:sessionId/promise/:promiseId` | `http://localhost:5173/api/a2a/sessions/sess_123/async` | Session-centric web flow; poll body uses **`asyncPending`** + **`status`** (+ optional `execute`, `result`, deferral fields). Session snapshot **`promiseStatus`** is on **`GET /sessions/:id`**, not renamed on `/async`. |
| **SDK `AsyncClient`** | `httpClient` base of SDK integration | `GET /async/status/:promiseId` (relative to SDK base) | `http://localhost:3001/async/status/prom_123` | SDK contract path is integration-defined and may differ from Vite route layout; adapters can map this to server `/api/v1/requests/:promiseId/result`. |

#### Example snippets by consumer

**A2A Server (direct polling):**

```text
GET http://localhost:3000/api/v1/requests/prom_123/result
```

**Vite Client API (web polling, preferred):**

```text
GET http://localhost:5173/api/a2a/sessions/sess_123/async
```

**Vite Client API (legacy/debug):**

```text
GET http://localhost:5173/api/a2a/sessions/sess_123/promise/prom_123
```

**SDK AsyncClient (integration route):**

```text
GET http://localhost:3001/async/status/prom_123
```

### GET `/async` response shape (storage mode)

Implementation: [`step-routes-async-flow.js`](../packages/vite-plugin/routes/step-routes-async-flow.js) (`normalizePromisePollStatus` in [`client-api-envelope.mjs`](../shared/client-api-envelope.mjs)).

| Situation | JSON shape |
|-----------|------------|
| **Idle** — no in-flight step / promise file | `{ "asyncPending": false, "completed": true, "status": "idle", "result": null }` |
| **Polling** — work in progress or just finished this tick | `asyncPending`, **`status`** (A2A request status string: e.g. `pending`, `processing`, `completed`, `failed`), `completed`, `result` (without `context` unless `?includeContext=1`), **`execute`** (Web DTO projection via `buildExecuteProjection`), **`requestPhase`**, **`retryAfter`** (dialog deferral / backoff). |
| **Legacy** `GET …/promise/:promiseId` | Same as polling row but body includes **`promiseId`** for debug. |

`promiseStatus` on **`GET /sessions/:id`** is the session-index / UI aggregate flag; **`/async`** uses the **`status`** field name for the polled server request row.

### GET `/sessions/{id}/messages` (delta)

Implementation: [`sessionRoutes.js`](../packages/vite-plugin/routes/sessionRoutes.js) (`GET …/messages`). **SDK:** same delta JSON when query includes **`afterSeq`** ([`sessions-read.ts`](../packages/sdk/src/server/server/routes/sessions-read.ts)); default list envelope `{ success, data, count }` when `afterSeq` is omitted.

| Query | Default | Role |
|-------|---------|------|
| `afterSeq` | `0` | Only messages with `seq > afterSeq` |
| `limit` | `50` (max `200`) | Page size |
| `withExecute` | off | Set `withExecute=1` to include projected **`execute`** on the payload |

Response JSON includes **`sessionId`**, **`afterSeq`**, **`lastSeq`**, **`hasMore`**, **`messages`**, **`asyncPending`**, **`promiseStatus`**, **`currentStep`**, and optionally **`execute`**. No transport **`promiseId`** in the envelope.

**Project storage mode:** route returns **404** (`messages delta not available in project storage mode`); use **`GET /sessions/{id}`** for full snapshot there.

Compatibility rule:
- Web UI + `SessionStore` use `/api/a2a/sessions/:id/async` as default polling route.
- Raw server integrations can poll `/api/v1/requests/:promiseId/result`.
- SDK integrations must document where `/async/status/:promiseId` is implemented (native route or adapter mapping).

## Browser modules

- **`action-executor.js`** — `submit` → if `asyncPending`, starts polling via `GET .../async` (storage mode). Non-storage mode may still poll by `promiseId` if the Client API has no `/async` route.
- **`session-data.js`** — `createSessionStoreCore()` function in runtime state
- **`window-state.js`** — On window open, if `asyncPending`, resumes polling without reading a promise id from the API payload.

Projection helpers are implemented in:
- `a2a-client/packages/vite-plugin/routes/utils/session-projection-dto.js`
- `a2a-client/packages/vite-plugin/routes/utils/execute-projection-dto.js`

## Loader

See [LOADER-BEHAVIOR.md](./LOADER-BEHAVIOR.md). Loader follows server/session state and promise pending flags; minimum display time is enforced in the client daemon layer.

## System messages (Red Room auto-responses)

- **Tri-role contract**: Web UI and Client API treat `messages[].role` as authoritative and must support `user`, `assistant`, and `system`. `system` messages represent Red Room auto-responses and system prompts.
- **Rendering policy**:
  - `system` messages are rendered in the main timeline with a distinct neutral style (`task-flow-message system`) and `System` label in the role header.
  - Telemetry-only system errors (e.g. `metadata.type === "error"` or `metadata.severity in {"error","warning"}`) may be hidden from the visible timeline but still stored for debugging.
- **Ordering**: `GET /api/a2a/sessions/{id}` returns `messages` in a single, flattened, chronological sequence derived from step artifacts (see `message-timeline.js`); `system` entries keep their position relative to `user`/`assistant` messages.
- **Persistence**:
  - Each completed step writes a `messages.json` slice that includes all roles without rewriting or dropping `system` messages.
  - The Client API rebuilds `messages` for the Web DTO by concatenating step slices; no additional filtering is applied beyond the telemetry rule above, so Red Room auto-responses remain non-lossy across refreshes and async polling.

## Related

- Red-room flow: [RED-ROOM.md](./RED-ROOM.md).
- Session file layout: [AGENTS.md](../../AGENTS.md) (Session Storage Format).
