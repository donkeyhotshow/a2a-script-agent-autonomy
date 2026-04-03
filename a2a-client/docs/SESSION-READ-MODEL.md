# Session Read Model

Purpose: define how simulation artifacts map to persisted client session fields and then to UI render behavior.

## Scope

- Read path only (storage -> API projection -> web store -> renderer).
- Uses the same shape as simulation fixtures under `simulations/*` (`request.json`, `response.json`, `received.json`).
- References concrete client code symbols used in production path.

## Canonical Read Pipeline

1. Step artifacts are read from `a2a-client/storage/sessions/{sessionId}/{step}/`.
2. Canonical session is reconstructed by `loadNewSession()` in `packages/vite-plugin/storage/newSessions.js`.
3. API projection/sanitization is applied by `toPublicSession()` in `packages/vite-plugin/routes/utils/session-projection-dto.js`.
4. Execute payload is sanitized to web DTO by `buildExecuteProjection` / `buildWebExecute` in `packages/vite-plugin/routes/utils/execute-projection-dto.js` and `shared/web-execute-dto.mjs`.
5. Web store hydrates in `web/js/session-store.js` (`restoreAndReconnect()`, `setExecute()`, `setContext()`, `applyServerMessages()`).
6. Renderer consumes store/execute in `web/js/task-flow/render.js` (`renderExecute()`, `renderForm()`, `renderWebExecuteMessage()`, `renderResultBlock()`, `renderMessageHistory()`).

## Mapping: simulation artifact -> client store field -> renderer behavior

| Simulation artifact | Client store / field mapping | Renderer behavior |
|---|---|---|
| `response.json.execute` (canonical action-key) | read via `loadNewStep()` / `loadNewSession()` -> projected by `toPublicSession()` (`buildExecuteProjection`) -> `SessionStore.setExecute()` | `renderExecute()` routes by payload shape: `form.choices` -> `renderForm()` choice UI; `form.textarea/input(s)` -> `renderForm()` input UI; `message/llmMessage/attachments` -> `renderWebExecuteMessage()` |
| `received.json.execute` (web-safe execute) | same shape returned by API (`toPublicSession()` + `buildWebExecute`) and stored in `core.execute` | used directly by `renderExecute()` routing logic; tool-only actions are expected sanitized into `message`/`attachments` for web flow |
| `response.json.context.execution` | loaded to session `context` and set by `SessionStore.setContext()` | `renderExecute()` shows execution step/action/progress and completed state banner (`execution.status`, `execution.progress`, `execution.step`, `execution.action`) |
| `response.json.context.workbench.sections` | available via `SessionStore.getWorkbenchSections()` from `core.context` | rendered by `buildWorkbenchSectionsHtml()` and appended in execute card |
| `response.json.context.workbench.slots.interruptTrace` | available via `core.context.workbench.slots.interruptTrace` | rendered by `buildInterruptTraceHtml()` as collapsible “Server LLM chain” block |
| `response.json.result` (action-key result object) | preserved in current response payload (`data.result`) | rendered by `renderResultBlock()` with per-action formatting (`read-file`, `rag-search`, `execute-command`, etc.) |
| Step `messages.json` (derived from server response flow; simulation-equivalent timeline source) | merged into store messages via `applyServerMessages()`; read in renderer from `state.messages` | `renderMessageHistory()` renders tri-role timeline (`user`, `assistant`, `system`); system error/warning messages are filtered by `isSystemErrorChatMessage()` |
| Step `server-promise.json` (async simulation equivalent of pending state) | detected by `getActiveAsyncWork()` / `attachPromiseMeta()`; exposed as `asyncPending`, `promiseStatus`, `promiseId` metadata; store uses waiting flags | `renderForm()` hides interactive form while waiting (`getTaskFlowPanelViewState(...).isWaiting`); UI keeps loader/pending behavior until async completion |
| Step `client-result.json` (user/tool input captured before next invoke) | persisted with `saveClientResult()` and used as step input artifact (not primary render payload) | no direct render block; influences next server response which is then rendered through execute/context/result path |
| Step `request-to-server.json` | transport/debug artifact only (`saveRequestToServer()` / `loadRequestToServer()`) | not rendered directly; used for diagnostics and protocol traceability |

## Read-model invariants

- Current effective state is based on the highest step with `server-response.json` (`loadNewSession()`), not just highest numeric folder.
- `messages.json` is step-sliced; UI timeline is reconstructed as merged conversation history and must preserve `system` role entries.
- Web renderer consumes web-safe execute DTO; canonical tool action keys should not leak into web `execute` in normal flow.
- Async is modeled as metadata (`asyncPending`, `promiseStatus`, optional `promiseId`) plus loader/wait state, not as completed execute content.

## Related symbols (quick index)

- Storage reconstruction: `loadNewSession`, `loadNewStep`, `listNewSteps` in `packages/vite-plugin/storage/newSessions.js`
- Session projection: `toPublicSession`, `getActiveAsyncWork`, `attachPromiseMeta` in `packages/vite-plugin/routes/utils/session-projection-dto.js`
- Execute projection: `buildExecuteProjection`, `buildWebExecute` in `packages/vite-plugin/routes/utils/execute-projection-dto.js`, `shared/web-execute-dto.mjs`
- View model adapter: `buildSessionViewModel` in `packages/vite-plugin/routes/utils/session-view-model.js`
- History adapter: `projectHistoryTimeline` in `packages/vite-plugin/routes/utils/history-projection.js`
- Store hydration: `restoreAndReconnect`, `setExecute`, `setContext`, `applyServerMessages` in `web/js/session-store.js`
- Rendering: `renderExecute`, `renderForm`, `renderWebExecuteMessage`, `renderResultBlock`, `renderMessageHistory` in `web/js/task-flow/render.js`

## Related docs

- `SESSION-STORE-ARCHITECTURE.md` - global vs per-window vs resolver usage and init order.
