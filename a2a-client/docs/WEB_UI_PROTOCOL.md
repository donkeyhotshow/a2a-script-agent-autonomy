# Web UI ↔ Client API protocol (agent)

Checkpoint: agent mode in `a2a-client/web` against the Vite **storage-mode** Client API (`/api/a2a/*`).

## Principles

1. **Transport ids stay server-side** — The browser does not need A2A `promiseId` to poll. The Client API resolves the active in-flight step and calls A2A internally.
2. **Web state is semantic** — UI and `SessionStore` react to `asyncPending`, `promiseStatus`, projected `execute`, `messages`, and loader flags, not to opaque backend ids.
3. **Ack + hydrate** — `POST .../next` returns a minimal ack; full state comes from `GET .../sessions/:id`.
4. **Canonical + projection split** — step files stay canonical; API response for web uses a deterministic UI projection.

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
| GET | `/api/a2a/sessions/{id}` | Authoritative snapshot: messages, execute, context (no `promiseId` in JSON; `asyncPending` + `promiseStatus` when waiting) |
| POST | `/api/a2a/sessions/{id}/next` | Submit user result; ack: `{ success, accepted, step, asyncPending, promiseId? }` (`promiseId` legacy; web uses `asyncPending`) |
| GET | `/api/a2a/sessions/{id}/async` | **Preferred for web:** one poll step for current async work; body has no transport id |
| GET | `/api/a2a/sessions/{id}/promise/{promiseId}` | Legacy/debug; same persistence side-effects as `/async` |
| GET | `/api/a2a/sessions/{id}/latest` | Step summary; nested `session` uses same public DTO as GET session |
| GET | `/api/a2a/sessions/{id}/messages` | Delta messages; includes `asyncPending` (not `promiseId`) |

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
<---------------------  ack `{ accepted, step, asyncPending }`

while asyncPending=true
GET /sessions/{sid}/async
  ---------------------> stepRoutes:async
                         READ `{N}/server-promise.json`
                         pending ? keep file
                                 : DELETE promise + WRITE response/messages
<---------------------  `{ asyncPending, promiseStatus }`

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
<----------------------  async status update for UI

final restore -------->  GET /sessions/{sid}
<----------------------  stable snapshot for renderer/session store
```

### Async polling URL matrix (A2A Server, Vite Client API, SDK AsyncClient)

| Consumer | Base URL | Poll / status route | Full example URL | Notes |
|----------|----------|---------------------|------------------|--------|
| **A2A Server** (raw invoke result API) | `A2A_SERVER_URL` (e.g. `http://localhost:3000`) | `GET /api/v1/requests/:promiseId/result` | `http://localhost:3000/api/v1/requests/prom_123/result` | Canonical server async endpoint; promise-id based transport flow. |
| **Vite Client API / Web UI** (storage mode) | Browser origin + `/api/a2a` (e.g. `http://localhost:5173/api/a2a`) | Preferred: `GET /sessions/:sessionId/async`; legacy: `GET /sessions/:sessionId/promise/:promiseId` | `http://localhost:5173/api/a2a/sessions/sess_123/async` | Session-centric web flow; UI should poll by session and read `asyncPending`/`promiseStatus` from DTO. |
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

Compatibility rule:
- Web UI + `SessionStore` use `/api/a2a/sessions/:id/async` as default polling route.
- Raw server integrations can poll `/api/v1/requests/:promiseId/result`.
- SDK integrations must document where `/async/status/:promiseId` is implemented (native route or adapter mapping).

## Browser modules

- **`action-executor.js`** — `submit` → if `asyncPending`, starts polling via `GET .../async` (storage mode). Non-storage mode may still poll by `promiseId` if the Client API has no `/async` route.
- **`session-data.js`** — `createSessionStoreCore()` function in runtime state
- **`window-state.js`** — On window open, if `asyncPending`, resumes polling without reading a promise id from the API payload.

Projection helpers are implemented in:
- `a2a-client/vite-plugin-a2a/routes/utils/session-projection-dto.js`
- `a2a-client/vite-plugin-a2a/routes/utils/execute-projection-dto.js`

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
