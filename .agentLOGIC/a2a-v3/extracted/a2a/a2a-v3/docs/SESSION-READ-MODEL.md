## SESSION READ MODEL

Data flow: server artifacts → client session store → renderer

### Server Payloads

| Artifact | Location | Purpose |
|----------|----------|---------|
| `received.json` | simulation output | Web DTO (mirrors Client API response) |
| `response.json` | simulation output | Server invoke response (used to build received.json) |
| `messages.json` | `sessions/{sessionId}/{step}/` | Step-scoped messages (server-side file) |

**received.json fields:**
- `projectId`, `sessionId` — identifiers
- `execute` — single action-key object (e.g. `{ "form": {...} }`)
- `context` — includes history, files, workbench, execution, status
- `messages` — step-scoped slice (optional)
- `result` — action-key shaped result (optional)

### Client Session Store (SessionStore, session-store.js)

| State Field | Source | Purpose |
|-------------|--------|---------|
| `sessionId` / `projectId` | `received.json` | Session/project identifiers |
| `messages` | `received.json.messages` / user input | Conversation history (tri-role: user/assistant/system) |
| `execute` | `received.json.execute` | Current action (form/script/etc.) |
| `context` | `received.json.context` | execution (step/action/progress), workbench, history |
| `status` | `received.json.status` | State (idle/processing/waiting/completed) |
| `pendingForm` | Task Flow UI | Tracks active form awaiting input |
| `lastError` | Client/server errors | Latest error for banner display |
| `promisePending` | Promise daemon | Async work in progress |
| `awaitingSessionVerify` | Reconnect flow | Bootstrap polling active |

### Rendering (Task Flow UI)

| Renderer | Uses | Output |
|----------|------|--------|
| `renderMessageHistory()` | `state.messages` | Tri-role chat bubbles + timestamps |
| `renderExecute()` | `execute` + `context` | Action UI (forms/progress/workbench) |
| `renderDialogErrorBanner()` | `state.lastError` | Error banner above history |
| `buildInterruptTraceHtml()` | `context.workbench.slots.interruptTrace` | Collapsible interrupt chain |
| `buildWorkbenchSectionsHtml()` | `context.workbench.sections` | Structured workbench display |

### Input Blocking Logic

| Flag | Meaning |
|------|---------|
| `promisePending` | Async work in flight |
| `awaitingSessionVerify` | Session bootstrap polling |
| `loaderActive` | Dialog loader running |
| `status === 'processing'` | Server processing |

**Result:** `isInputBlocked()` returns `true` when ANY flag set → disable inputs, show spinner.

---
  - **Client store field**: Not stored directly; projection is typically used to build `messages` before feeding into `SessionStore.applyServerMessages()`.
  - **Renderer behavior**:
    - `renderMessageHistory()` treats projected history like any other messages slice:
      - System entries with error metadata may be filtered from main chat (via `isSystemErrorChatMessage`).
      - Other system entries are rendered with role label "System".

### End-to-End Mapping Summary

For each step, the flow is:

1. **Server artifacts**:
   - `response.json` contains `execute`, `context`, `result`.
   - Client API transforms this into `received.json` with `projectId`, `sessionId`, `status`, `messages` (merged from step `messages.json`), and the same `execute`/`context`/`result` contract.

2. **Client session store ingestion**:
   - API integration calls:
     - `SessionStore.setSession(sessionId, projectId)` on session creation/restore.
     - `SessionStore.setContext(received.context)` to apply `workbench_ops` and emit `context` updates.
     - `SessionStore.setExecute(received.execute)` for the current step action.
     - `SessionStore.applyServerMessages(received.messages)` to sync chat history.
     - `SessionStore.setStatus(received.status)` and async helpers (`setPromisePending`, `setAwaitingSessionVerify`) based on loader/promise state.

3. **Renderer behavior**:
   - Task Flow UI reads `store.getState()` and `store.getLoaderState()`:
     - Uses `messages` to render chat history (`renderMessageHistory`).
     - Uses `execute`, `context.execution`, `context.workbench` to render the current task step, interrupt trace, and workbench sections (`renderExecute`).
     - Uses `status`, `promisePending`, `awaitingSessionVerify`, loader state to control loaders and input blocking.

This contract ensures that any simulation artifact (`response.json`/`received.json` + step storage) can be mapped deterministically into the session store and rendered UI without special cases beyond the action-key shape and workbench semantics described in `AGENTS.md`.

