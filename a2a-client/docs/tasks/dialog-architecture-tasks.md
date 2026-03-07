# Dialog architecture task breakdown (condensed)

This doc captures the intent and outcomes of the dialog architecture audit that was originally captured in `a2a-client/DEV_STATE.md`. It keeps the essential flows, decisions, and QA checkpoints for the session/SSE stack without the verbatim code dumps.

**Implementation tasks:** [dialog-frontend-tasks.md](dialog-frontend-tasks.md) (8 tasks, priorities, acceptance criteria).

## Related Workflows

For implementation of the dialog architecture patterns:
- **[Session Lifecycle Scenarios](../workflows/session-lifecycle/)** - Session lifecycle audit and QA scenarios
- **[Communication Scenarios](../workflows/communication/)** - SSE/WebSocket decision log and transport policy
- **[Task Execution Scenarios](../workflows/task-execution/)** - Execute handling catalog and processing flows
- **[UI Interaction Scenarios](../workflows/ui-interactions/)** - Panel QA scenarios and lifecycle coverage

## 1. Session lifecycle audit

- **Flows covered:** session creation, load/project switch, focus switch, deletion.
- **Key components:** `SessionManager`, `SessionPanelManager`, `SSEClient`, `SessionSync`, `PlasticineUI`.
- **State transitions:** creation pushes a panel → `PlasticineUI` renders → `SessionManager` marks active → SSE connection opens and `SessionSync` registers handlers; switching disconnects the old SSE/WS, reconnects for the new session, and highlights the new panel.
- **Real-time updates:** SSE events feed `SessionSync`, which pushes context into `SessionViewModel`. UI listeners react to `messages`, `execute`, and `executionStep/Progress` events.
- **Audit takeaway:** keep the 1:1 mapping between SSE context updates and panel state while ensuring panels clean up listeners when deleted.

## 2. Execute handling catalog

| Execute type | Handler | UI effect | Result payload |
|--------------|---------|-----------|----------------|
| `finalResult` | `SessionManager.processExecute` | show completion summary | `{"finalResult": {...}}` |
| `form` | same | interactive form panel | `{"form": {...}}` |
| `message` | same | append to dialog stream | `{"message": {...}}` |
| `script` | same | script execution panel | `{"script": {...}}` |
| `rag-search` | same | RAG panel | `{"rag-search": {...}}` |
| `read-file` | same | file selector | `{"read-file": {...}}` |
| `write-file` | same | save dialog | `{"write-file": {...}}` |
| `execute-command` | same | command execution panel | `{"execute-command": {...}}` |

- All submissions obey the action-key shape (`{ result: { "<action>": {...} } }`), and context execution progression (`step`, `action`, `progress`) emits `executionStep`/`executionProgress` events for UI binding.

## 3. SSE vs WebSocket decision log

- **Primary transport:** SSE via `/api/sse/:sessionId`, heartbeat every ~30s, reconnect/backoff built into `sse-client.js`.
- **Fallback:** WebSocket (`/api/ws/:sessionId`) only when SSE fails (network error, CORS, timeout); retains message queue and 30s heartbeat.
- **Limits:** one SSE + one WebSocket per session; reconnect attempts capped (e.g., 5 tries, incremental 3s base).
- **Policy:** SSE carries real-time updates, WebSocket adds bidirectional messaging, future HTTP polling is reserved for complete failure.
- **Resource cleanup:** On session switch `SessionManager` closes the active EventSource/WebSocket, clears queues, resets `SessionSync`.

## 4. SessionSync contract snapshot

- **Message contract:** SSE `'message'` pushes normalized record → `SessionViewModel.messages` → `messages`/`message` events.
- **Task response contract:** SSE `'task_response'` applies context + execute payloads, then pushes assistant message; `context.execution` drives progress indicators.
- **Update/progress/complete:** `'session_update'` and `'progress'` update `context.execution`; `'complete'` includes `finalResult`.
- **Safety rules:** `context.execution.progress` must be monotonic (reject regressions); any unchecked duplicate events trigger dedup logging hooks.
- **Future enhancements:** sequence numbers, CRDT merge on context, dedup by event ID (placeholders already noted for later implementation).

## 5. Plasticine panel QA scenarios

- **Lifecycle coverage:** panel creation (sessionsLoaded/sessionCreated), state transitions (minimize/expand/dock), persistence (layout restored after reload), SSE-driven updates (progress, step, completion), removal on deletion.
- **Bugs to watch:** panel creation failures, layout corruption, cube overlap, memory leaks, missing SSE integration for progress.
- **Testing matrix:** ensure each scenario (creation/destruction, state transitions, layout persistence, SSE updates) has a deterministic Playwright test (see `web/tests/e2e` for current scripts).
- **Improvements:** tie panel progress indicators directly to `context.execution`, separate layout metadata from other context fields, and clean up DOM/listeners when panels are destroyed.

## 6. Reliability recap

- **Heartbeat monitoring:** watchdog in `tests/helpers/sse-instrumentation.ts` observes heartbeat gaps (>35s) and marks the UI as degraded until reconnection.
- **Transport fallback:** decision tree (SSE success → continue; SSE failure → evaluate reason → try WebSocket → fallback to polling if needed) is enforced in `SessionManager`.
- **Persistence:** browser session → localStorage → server storage is authoritative; `SessionPanelManager` ensures each session remembers its saved layout even after reload.
- **KPIs to track:** heartbeat success >99.9%, reconnection <5s, session persistence 100%, transport fallback <10s transition.

## 7. Summary

- All nine dialog architecture tasks are covered via flow documentation, execute mapping, transport decision logic, contract tests, and QA scenarios.
- This condensed doc keeps the context without the full verbatim sequences; refer back to `a2a-client/DEV_STATE.md` or the JS sources (`session-manager.js`, `session-sync.js`, `plasticine-ui.js`) for the detailed traces when needed.
