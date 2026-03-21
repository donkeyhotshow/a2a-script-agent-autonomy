# Web UI ↔ Client API protocol (dialog)

Checkpoint: dialog in `a2a-client/web` against the Vite **storage-mode** Client API (`/api/a2a/*`).

## Principles

1. **Transport ids stay server-side** — The browser does not need A2A `promiseId` to poll. The Client API resolves the active in-flight step and calls A2A internally.
2. **Web state is semantic** — UI and `SessionStore` react to `asyncPending`, `promiseStatus`, `execute`, `messages`, and loader flags, not to opaque backend ids.
3. **Ack + hydrate** — `POST .../next` returns a minimal ack; full state comes from `GET .../sessions/:id`.

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
- **`DialogPromise` + `SessionStoreCore`** — `startPolling(checkFn, { sessionScoped: true })` when no id is held in the UI.
- **`window-state.js`** — On window open, if `asyncPending`, resumes polling without reading a promise id from the API payload.

## Loader

See [LOADER-BEHAVIOR.md](./LOADER-BEHAVIOR.md). Loader follows server/session state and promise pending flags; minimum display time is enforced in the client daemon layer.

## Related

- Session file layout: [AGENTS.md](../../AGENTS.md) (Session Storage Format).
- Vite plugin daemon (Node): `a2a-client/vite-plugin-a2a/daemon/README.md` (polls A2A Server for other callers).
