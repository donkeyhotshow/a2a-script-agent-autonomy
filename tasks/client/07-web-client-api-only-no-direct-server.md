# Client Task 07: Web – Client API only, no direct server calls

## Goal

Ensure **a2a-client/web** never talks directly to a2a-server (port 3000). All HTTP and real-time communication must go through **Client API** (port 3001). Remove or refactor any code that bypasses Client API.

## Scope

- `a2a-client/web/` (all JS, config, env)
- Documentation and dev setup

## Requirements

- **1. Audit and remove direct server URLs**
  - Search for any `localhost:3000`, `/api/v1/` used as base URL from web, or references to "server" that imply direct fetch to a2a-server.
  - Replace with Client API base (e.g. relative `/api` or configured Client API URL like `localhost:3001`).
  - Ensure `apiIntegration`, `SessionManager`, `TaskFlow`, `SSEClient`, `web-api-client.js` use only Client API endpoints.

- **2. Endpoint mapping**
  - Document and enforce in code:
    - Web → `GET/POST /api/sessions`, `/api/sessions/:id`, `/api/sessions/:id/action`, `/api/sessions/:id/next`, `/api/sessions/:id/cancel`.
    - Web → `/api/projects`, `/api/config` (if used).
    - Web → SSE/WebSocket to Client API only (e.g. port 3002 or same host as Client API).
  - No Web → `/api/v1/invoke`, `/api/v1/requests/*` from browser; those are Client API → server only.

- **3. Configuration**
  - Single place (e.g. env or config panel) for "API base URL" = Client API base (e.g. `http://localhost:3001` or relative).
  - Remove any separate "server URL" or "A2A server URL" from Web UI config; only Client API URL is exposed to the user/app.

- **4. Tests and docs**
  - Add a short checklist or test that verifies: with server disabled, Web can still load and call Client API; with Client API disabled, Web shows clear errors (no silent fallback to server).
  - Update `WEB-UI.md` and any README to state: "Web communicates only with Client API."

## Acceptance criteria

- No fetch/XMLHttpRequest/WebSocket from web code to a2a-server (port 3000).
- All session, task, and progress flows use Client API endpoints only.
- Documentation and config reflect "Web → Client API only."

## References

- `docs/new-request-flow/ARCHITECTURE.md`
- `docs/new-request-flow/WEB-UI.md`
- `docs/new-request-flow/API-SERVER.md`
- `a2a-client/web/js/api-integration.js`
- `a2a-client/web/js/web-api-client.js`
