# Task 2: Simulation-based testing for api-client and Web

## Goal

Design and document how to use `simulations/` to automatically and manually verify correctness of:

- `a2a-client/packages/api-client` (client ↔ server protocol implementation)
- `a2a-client/web` (Web UI behavior over Client API)

## References

- Simulations:
  - `simulations/SCHEMA.md`
  - `simulations/REFERENCE.md`
  - Example sims: `simulations/fix-vue-imports/`, `simulations/coder/`, `simulations/coder-smart/`, `simulations/auto-ai/`, `simulations/task-decomposition/`
- New-request flow docs:
  - `new-request-flow/SIMULATION-FORMAT.md`
  - `new-request-flow/PROTOCOL.md`
  - `new-request-flow/SESSION-FLOW.md`
  - `new-request-flow/SCHEMAS.md`
  - `new-request-flow/ACTION-MAP.md`
- JSON Schemas for server protocol:
  - `new-request-flow/json-schemas/server-invoke-request.schema.json`
  - `new-request-flow/json-schemas/server-invoke-response-first-form.schema.json`
  - `new-request-flow/json-schemas/server-invoke-response-execute.schema.json`
  - `new-request-flow/json-schemas/server-invoke-response-pending.schema.json`
- Transform DSL:
  - `new-request-flow/json-schemas/server-transform.schema.json`

## Work to perform

1. **Define test harness for api-client**
   - Describe how to replay each simulation step (`request.json` / `response.json`) against a running `a2a-server` (or stub) using `api-client`:
     - For each `simulations/<sim>/<step>/request.json`, send the request through `api-client` to `/api/v1/invoke`.
     - Capture actual server responses and compare them to `response.json` (modulo known free-form fields like timestamps, history ordering if documented).
   - Specify how to validate:
     - Request encoding matches `server-invoke-request.schema.json`.
     - Response decoding matches the appropriate response schema (first-form / execute / pending).
   - Decide where to put code for this harness (e.g. `a2a-client/packages/api-client/tests/simulations.test.ts`).
2. **Define simulation-driven tests for Web UI**
   - Describe how Web (`a2a-client/web`) should be tested using simulations, ideally via:
     - Controlled backend (server + client API) that replays simulation steps deterministically.
     - Or a test mode in Client API that loads `simulations/` from disk and exposes them via test endpoints.
   - For each core flow (fix-vue-imports, coder, auto-ai, task-decomposition), define:
     - Initial user action in Web (enter task, select project).
     - Expected calls from Web → Client API (`/api/sessions`, `/api/sessions/:id/action`, `/api/sessions/:id/next`, etc.).
     - How those map to `request.json` and `response.json` from simulations.
     - What should be rendered in the UI (forms, messages, session panels, buttons states).
   - Decide on tooling (e.g. Playwright / Cypress / Vitest + jsdom) and folder for Web simulation tests.
3. **Document the workflow**
   - In `new-request-flow/` (new doc or extension of existing one), describe:
     - “How to run simulation-based tests for api-client”.
     - “How to run simulation-based tests for Web”.
   - Make sure the docs reference:
     - Specific simulations used as golden tests.
     - Expected invariants (context propagation, action-key shape, correct usage of `execute.form.choices`, etc.).

## Acceptance criteria

- Clear, step-by-step documented plan for:
  - Replaying simulations against `api-client` and verifying protocol correctness.
  - Driving Web UI with Client API wired to simulations to validate end-to-end flows.
- Identified locations (test files / packages) where this will be implemented.
- All relevant docs and schemas cross-linked so a new contributor can follow the testing approach without guessing.

