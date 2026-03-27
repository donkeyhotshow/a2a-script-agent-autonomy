## SESSION READ MODEL

### Overview

This document describes how session-related data flows from server-side simulation artifacts into the web client session store and finally into the renderer. The mapping is aligned with `SC-01 session-view-model`, `SC-03 history-projection-boundary`, and the current Task Flow UI.

### Canonical Server Payload Pieces

- **Simulation artifact: `received.json`**
  - Mirrors the web DTO returned by Client API for a given step.
  - Important fields:
    - `projectId`, `sessionId`
    - `execute` (single action-key object, e.g. `{ "form": { ... } }`)
    - `context` (includes `history`, `files`, `workbench`, `workbench_ops`, `execution`, `status`)
    - `messages` (step-scoped messages slice; optional)
    - `result` (action-key shaped result; optional)

- **Simulation artifact: `response.json`**
  - Server-side invoke response used by Client API to build `received.json`.
  - Same `execute`/`context`/`result` contract; does not contain merged message history.

- **Simulation artifact: step `messages.json` (session storage)**
  - File-backed representation of messages per step in `a2a-client/storage/sessions/{sessionId}/{step}/messages.json`.
  - Used only on the server side; Client API derives the `messages` array that ends up in `received.json`.

### Client Session Store Fields

Session store is created via `SessionData.createSessionStoreCore()` and wrapped by `SessionStore` (`session-store.js`). The core state contains:

- **`state.sessionId` / `state.projectId`**
  - **Source**: `received.json.projectId`, `received.json.sessionId`
  - **Store field**: `core.sessionId`, `core.projectId`
  - **Setter**: `setSession(sessionId, projectId)` and `reset(sessionId, projectId)`
  - **Renderer use**: Used by loaders/promise daemons and for wiring `ActionExecutor.bootstrapSessionUi`.

- **`state.messages`**
  - **Source**:
    - On reload: `received.json.messages` built from step `messages.json` slices.
    - At runtime: client pushes user/assistant messages via `pushMessage()`.
  - **Store field**: `core.messages`
  - **Setters**:
    - `applyServerMessages(messages)` – used in `restoreAndReconnect()` to sync from server.
    - `pushMessage(msg, role)` – used by Task Flow / input handlers.
  - **Renderer use**:
    - `renderMessageHistory()`:
      - Reads `state = store.getState()`.
      - Uses `state.messages ?? store.messages` as `messagesSource`.
      - Filters out system error messages (via `isSystemErrorChatMessage()`).
      - Renders tri-role chat bubbles with optional timestamps.

- **`state.execute`**
  - **Source**:
    - Initial step: `received.json.execute` (from `response.json.execute`).
    - Subsequent steps: updated from server after each invoke.
  - **Store field**: `core.execute`
  - **Setters**:
    - `setExecute(execute)` – generic setter used by API integration and `SessionStore.createSessionWithForm()`.
  - **Renderer use**:
    - Task Flow orchestrator passes `execute` into `renderExecute(contentEl, execute, data, store, taskFlowRef)`.
    - `renderExecute` combines `execute` with `data.context` and `data.result` to:
      - Show current step/action (`execution.step`, `execution.action`).
      - Render progress and completion banners.
      - Embed `workbench` visualization (sections, interrupt trace).
      - Render `form` / other tools via downstream helpers (not detailed here).

- **`state.context`**
  - **Source**: `received.json.context` (derived from `response.json.context` plus any transforms).
  - **Store field**: `core.context`
  - **Setter**:
    - `SessionStore.setContext(context)`:
      - Assigns `this.core.context = context`.
      - Emits `context` event for listeners.
    - Core `context` setter runs `applyWorkbenchOps(context)` before storing, so `workbench_ops` mutates `context.workbench`.
  - **Renderer use**:
    - `renderExecute()`:
      - Reads `context` from `data.context`.
      - Uses `context.execution` for:
        - Step label (`execution.step`)
        - Action name (`execution.action`)
        - Progress bar (`execution.progress`)
        - Protocol completion (`execution.status === 'completed'`).
      - Uses `context.workbench.slots.interruptTrace` for collapsible interrupt chain:
        - `buildInterruptTraceHtml(context)` renders `<details>` with per-step rows.
      - Uses `context.workbench.sections` for structured workbench visualization:
        - `buildWorkbenchSectionsHtml(context)` renders sections as JSON/primitive lists.

- **`state.status`**
  - **Source**:
    - Initial: derived from presence of `sessionId` (`'created'` vs `'idle'`).
    - Updates: `received.json.status` and client transitions (e.g. `'processing'`, `'waiting'`, `'completed'`).
  - **Store field**: `core.status`
  - **Setters**:
    - `setStatus(status)` – emits `status` event.
    - `reset()` – sets baseline status.
  - **Renderer use**:
    - Participates in `isWaitingForInput()` and `isInputBlocked()`:
      - `'waiting'` → user can provide input (form or message).
      - `'processing'` → inputs are blocked, loader is active.

- **`state.pendingForm`**
  - **Source**:
    - Derived by UI when an `execute.form` is active and awaiting user choice / input.
  - **Store field**: `core.pendingForm`
  - **Setters**:
    - Updated by Task Flow logic when form is shown/cleared.
  - **Renderer use**:
    - `isWaitingForInput()` returns `true` when `pendingForm` is set.
    - Task Flow UI uses this to decide whether to show a form panel versus message-only view.

- **`state.lastError`**
  - **Source**:
    - Client-side errors (network failures, contract violations).
    - Server-side error responses mapped into a synthetic system message or `lastError`.
  - **Store field**: `core.lastError`
  - **Setters**:
    - `setError(err)` / `clearLastError()`.
  - **Renderer use**:
    - `renderMessageHistory()` calls `renderDialogErrorBanner(state.lastError)` and prepends a banner over the history.

- **Async State: `promisePending`, `awaitingSessionVerify`, loader**
  - **Source**:
    - Promise daemon: `promise_routes` / `/async` polling results.
    - Loader daemon: per-session `DialogLoader`.
  - **Store fields**:
    - `state.promisePending`
    - `state.awaitingSessionVerify`
    - Derived loader state via `getLoaderState(sessionId)`.
  - **Setters**:
    - `setPromisePending(bool)` – toggles async-blocked state.
    - `setAwaitingSessionVerify(bool)` – used in `restoreAndReconnect()` while GET `/async` bootstrap runs.
    - `startLoader(sessionId)` / `stopLoader(sessionId)` – delegate to per-session loader.
  - **Renderer use**:
    - `getState()` composes:
      - `promisePending`
      - `loaderActive`
      - `awaitingSessionVerify`
      - `status`
    - `isInputBlocked()` returns `true` when any of these block user input.
    - Task Flow and Loader UI use these flags to:
      - Show mandatory spinner while work is in-flight.
      - Disable send buttons and form inputs.

### History Projection and Messages

- **Simulation artifact: `context.history` (`response.json` / `received.json`)**
  - **Source**: Server-side history of AI interactions and system prompts.
  - **Projection**: `projectHistoryTimeline({ context, workbench })` in `history-projection.js`:
    - Normalizes entries to `{ role, content, source: 'history', idx }`.
    - Detects `system` role using `entry.role` and metadata (`source === 'system-prompt'` or `type === 'system'`).
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

