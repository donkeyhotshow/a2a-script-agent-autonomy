# Task 4: Web & Client API documentation (a2a-client/web, api-client, api-server)

## Goal

Create focused, up-to-date documentation for:

- Web UI (`a2a-client/web`)
- Client API server (`a2a-client/packages/api-server`)
- Server HTTP client (`a2a-client/packages/api-client`)

Document how they work together over the new request flow and simulations.

## References

- Web:
  - `a2a-client/web/js/app-boot.js`
  - `a2a-client/web/js/app-init.js`
  - `a2a-client/web/js/app-state.js`
  - `a2a-client/web/js/sessions.js`
  - `a2a-client/web/js/actions-manager.js`
  - `a2a-client/web/js/web-api-client.js`
  - `a2a-client/web/js/flow/*`
- Client API server:
  - `a2a-client/packages/api-server/src/index.ts`
  - Any existing routes and middleware.
- API client:
  - `a2a-client/packages/api-client/src/index.ts`
  - `a2a-client/packages/api-client/src/protocol.ts`
  - `a2a-client/packages/api-client/src/async-client.ts`
  - `a2a-client/packages/api-client/src/action-handler.ts`
- Architecture / protocol:
  - `new-request-flow/ARCHITECTURE.md`
  - `new-request-flow/PROTOCOL.md`
  - `new-request-flow/SESSION-FLOW.md`
  - `new-request-flow/ACTION-MAP.md`
  - `new-request-flow/IMPLEMENTATION-STATUS.md`

## Work to perform

1. **Web UI documentation**
   - Write a dedicated doc (e.g. `new-request-flow/WEB-UI.md` or under `a2a-client/web/docs/`) describing:
     - Overall Web architecture (entrypoints, state management, session panels, flow UI).
     - How Web talks to Client API:
       - Endpoints: `/api/sessions`, `/api/sessions/:id/action`, `/api/sessions/:id/next`, `/api/sessions/:id/cancel`, `/api/projects`, `/api/config`, etc.
       - Expected request and response shapes (link to protocol schemas in `new-request-flow/json-schemas`).
     - How Web renders and reacts to `execute.form`, `execute.message`, and session state changes.
   - Describe how Web is expected to be tested with simulations (reference Task 2).
2. **Client API (api-server) documentation**
   - Document:
     - All HTTP routes provided by `api-server` and their purpose.
     - Internal session model and storage (in-memory / file / future DB).
     - How `api-server` uses `api-client` to call `a2a-server`.
   - Ensure the documented API matches `new-request-flow/PROTOCOL.md` and `SCHEMAS.md`.
3. **API client documentation**
   - Explain:
     - Public API surface: methods like `invoke`, any high-level helpers.
     - How it constructs requests and processes responses according to:
       - `server-invoke-request.schema.json`
       - `server-invoke-response-*.schema.json`
     - How it integrates with simulations (Task 2).
4. **Cross-linking and diagrams**
   - Add/update diagrams showing:
     - Web → Client API → Server → External AI Hub data flow.
     - How simulations fit into this flow as golden traces.
   - Ensure docs link back to `simulations/SCHEMA.md` and `new-request-flow/SIMULATION-FORMAT.md`.

## Acceptance criteria

- Separate, focused documentation sections/files for:
  - Web UI behavior and endpoints it uses.
  - Client API server behavior and routes.
  - Server HTTP client behavior and protocol expectations.
- All three clearly reference simulations and protocol schemas, and are aligned with `ARCHITECTURE.md` and `PROTOCOL.md`.

