# Web UI ↔ Client API protocol (agent)

Checkpoint: agent mode in `a2a-client/web` against the Vite **storage-mode** Client API (`/api/a2a/*`).

## Principles

1. **Transport ids stay server-side** — The browser does not need A2A `promiseId` to poll. The Client API resolves the active in-flight step and calls A2A internally.
2. **Web state is semantic** — UI and `SessionStore` react to `asyncPending`, `promiseStatus`, `execute`, `messages`, and loader flags, not to opaque backend ids.
3. **Ack + hydrate** — `POST .../next` returns a minimal ack; full state comes from `GET .../sessions/:id`.

## `execute` shape for the browser (Web DTO)

`GET /api/a2a/sessions/{id}` (and related routes that use the public session DTO) return **`execute` sanitized for the UI**: raw protocol actions such as `rag-search`, `read-file`, `write-file`, `script`, `execute-command`, `list-directory`, `grep-search`, `file-exists`, `edit-patch`, and `run-script` are **removed** and replaced with:

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

The **server protocol** and simulation **`response.json`** still use a **single action key** under `execute`, and any **`result`** (if present) must follow the **action-key shape** (e.g., `{ "read-file": { ... } }`). Goldens for **`received.json`** match this Web DTO (see `simulations/SCHEMA.md`). With **`?includeContext=1`**, the session payload may include full internal `context` (including **`workbench.sections`**) for debugging; prefer not to rely on raw `execute` keys in the UI.

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

## Browser modules

- **`action-executor.js`** — `submit` → if `asyncPending`, starts polling via `GET .../async` (storage mode). Non-storage mode may still poll by `promiseId` if the Client API has no `/async` route.
- **`session-data.js`** — `createSessionStoreCore()` функция в runtime state
- **`window-state.js`** — On window open, if `asyncPending`, resumes polling without reading a promise id from the API payload.

## Loader

See [LOADER-BEHAVIOR.md](./LOADER-BEHAVIOR.md). Loader follows server/session state and promise pending flags; minimum display time is enforced in the client daemon layer.

## Related

- Session file layout: [AGENTS.md](../../AGENTS.md) (Session Storage Format).
- Vite plugin daemon (Node): `a2a-client/vite-plugin-a2a/daemon/README.md` (polls A2A Server for other callers).
