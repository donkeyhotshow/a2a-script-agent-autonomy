# Remote web viewer + local client workflow

This describes the “you-on-phone → web UI → local client → remote server” setup that you asked for. The key idea is:

1. **Web UI stays minimal** – it never stores history or logs locally. It just renders whatever `execute`/`message`/`form` the local client returns and forwards your choices/results from the phone to the client (e.g. `POST /api/a2a/sessions`, `POST /api/a2a/sessions/:id/next`, etc.).
2. **The local client keeps everything** – history, exchange log, virtual document, execution state and UI state. It is the single source of truth for `context.history`, `context.exchangeLog`, `context.execution`, `messages`, panel layout and progress indicators, etc., and it persists that data via `@a2a/history`/`SessionStorage`/`HistoryManager` before sending the processed `request` to the faraway server. The web simply renders the snapshot that the client exports on every request, so the entire layout can be restored after a reload without storing anything in the browser itself.
3. **Remote server stays stateless** – it only sees the `request` payload the client builds from its local context/history and replies with `execute` + optional `context` updates; the client immediately stores those updates (see `a2a-client/packages/sdk/src/server/index.ts` for how `context`, `execute`, `messages`, and `exchangeLog` are merged back into the session record) and streams the new `execute` back to the web UI.

## What you need to remember

- **Web interface**: only `SessionManager` on the page (`a2a-client/web/js/session-manager.js`) talks to the local client API. It calls **`POST /api/a2a/sessions`** to start a task/session and then uses **`POST /api/a2a/sessions/:id/next`** (+ poll **`GET …/async`**) to propagate responses. After each call it consumes `execute` + `context` (including panel metadata and progress state returned by the client) and shows the relevant UI, but it never persists the conversation – the local client does. The project selector in the header is what tells this client which project’s dataset to load, so every project has its own stored session/log snapshot and switching projects reloads that project’s panel state/history.
- **Local client**: is the thing on your desktop. It keeps `context.history`, `context.exchangeLog`, `messages`, `execute`, and the layout state for every panel via the storage layer in `@a2a/history` (`HistoryManager`, `SessionStorage`, etc.). When you provide a new `result`, the client builds the next `request` (using `buildProtocolContext` from **`@a2a/sdk`**, `protocol.ts`) and forwards it to the remote server; when the server replies, the client updates its stored context/execute/log and streams the new UI payload to the phone, including the panel metadata so the web can rebuild the same layout even after a reload.
- **Panel ↔ session mapping**: each panel on the web corresponds to one `sessionId` that lives on the client. Opening a panel requests (or creates) its session via **`GET /api/a2a/sessions/:id`** (or **`POST /api/a2a/sessions`** for new work), and closing a panel leaves the session stored under the current project. When the project selector changes, the web calls **`GET /api/a2a/sessions?projectId=…`**, iterates over the session list, and rehydrates every panel by feeding its stored `execute/context` back into `SessionManager.processExecute`; this guarantees every project has its own panel/layout snapshot and panels never share sessions.
- **Why this matters**: if you lose internet to the server, you still keep a full log on the client (visible through CLI or SDK). The web UI never needs to reconnect to the server — it reconnects to the local client, which replays the latest `context` for you. When the server is ready again, the client already has the history packaged and will continue sending proper `context.history`/`exchangeLog` for each new request.

## References for implementers

- Web: `a2a-client/web/js/session-manager.js` — all remote requests happen here.
- Local storage: `a2a-client/packages/history/src/history-manager.ts` + `session-storage/…` — keeps exchange log/history/docs before every server request.
- SDK entry point: `a2a-client/packages/sdk/src/index.ts` exports `@a2a/sdk` (client + server); add `HistoryManager` exports when you need CLI helpers.
- Protocol: `docs/new-request-flow/PROTOCOL.md` and any simulation folder under `simulations/` describe how `context.history` is packed into `request.json`/`request.md` and how `execute` flows back to the UI.

## API flow examples

### Switching projects
- `GET /api/a2a/sessions?projectId=<id>` — fetch the list of stored sessions (`sessionId`, `selectedAction`, `status`, `updatedAt`). The client responds with the set that belongs to the chosen project.
- For each panel you want to open, call `GET /api/a2a/sessions/:id` or reuse the `execute/context` returned inside the list response. Feed that payload into `SessionManager.processExecute` so the web builds the exact panel layout/progress the client previously saved.
- When starting new work under that project, `POST /api/a2a/sessions` → client creates a session, stores it with `HistoryManager`, and returns the new `sessionId`. Opening the panel for that ID immediately renders the returned `execute/context`.

### Panel metadata that gets restored
- The client stores panel layout plus metadata (slot, size, dock state, cube status, progress) inside the session snapshot as part of `context`/`execute` or a parallel storage layer in `@a2a/history`. After each server response the web receives the latest snapshot — this is what lets panels remain in the same place after reload.
- If you add new UI metadata (e.g., dark/light variant, custom badges), keep storing it alongside `context` or on the history side so `GET /sessions/:id` keeps returning it to the web for `processExecute`.

## CLI / SDK side view

- Use the SDK/HistoryManager to inspect saved sessions without the web UI: import `HistoryManager` from `@a2a/history` (or add it to `@a2a/sdk`) and call `historyManager.getSession(sessionId)` to see `context`, `execute`, `exchangeLog`, `panels`, etc.
- The CLI can also replay the exchange log by calling `historyManager.getExchangeLog(sessionId)` or rehydrate messages via `historyManager.reconstructMessagesFromLog()`. This is the same data the web UI displays; nothing is lost when you switch to CLI.
- When troubleshooting, you can append `exchangeLog` entries manually and the subsequent `buildProtocolContext` call will include them (`context.exchangeLog`), so the server always sees an up-to-date log even if you typed answers via CLI instead of the phone.
If you want me to expand this into a quick tutorial or add diagrams, just say where to drop it.
