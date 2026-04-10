# API Client-Server Logic

**Endpoints:**
- UI uses `/api/a2a/*`
- `POST /sessions/{id}/next` → ack-first
- `GET /sessions/{id}` → final state
- `GET /sessions/{id}/async` → poll while pending

**Step Lifecycle:** For step N result: persist `N/client-result.json` → build `(N+1)/request-to-server.json` → invoke server → if async: write `server-promise.json` → on completion: write `server-response.json` + `messages.json`

**Session Source:** Highest step with `server-response.json` is authoritative. Rebuilt from step artifacts, not root `session.json`.

**Red-Room:** Automatic tool execution cycle: server returns `execute` → client runs tool → records result → sends `/next` (standard flow, not separate protocol).

**Guardrails:** Maintain action-key shape, write all step artifacts, don't expose transport internals.
