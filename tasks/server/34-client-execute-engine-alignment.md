# Task 34: Client execute engine alignment with simulations and protocol

## Goal

Align the **client-side execute engine** (API client + Client API server) with the simulations and canonical protocol, so that:

- Every `execute.<action>` and `result.<action>` used in simulations is correctly handled by the client stack.
- Web UI and Client API use the new **action-key shape + `execute.form.choices`** canon end-to-end.
- Legacy formats (`actions[]`, `executingAction`, etc.) are fully isolated and can be removed later.

## Background

From:
- `docs/new-request-flow/PROTOCOL.md`
- `docs/new-request-flow/API-SERVER.md`
- `docs/new-request-flow/API-CLIENT.md`
- `docs/new-request-flow/SESSION-FLOW.md`
- `simulations/SCHEMA.md` and individual simulation descriptions

we have:

- Canonical first response: `context` + `execute.form.choices` (no `actions[]`).
- Canonical execute/result = **action-key shape**.
- Simulation flows that use:
  - `form`, `message`
  - `script`
  - `rag-search`
  - `read-file`, `write-file`, `list-directory`, `file-exists`
  - `execute-command`
  - extended actions: `capture-task`, task-decomposition actions, `write-doc`, etc.
- API Client already has protocol utilities and `handleActionResponse`, but we need a clear, tested alignment between:
  - server responses from `/api/v1/invoke` and `/api/v1/requests/*`
  - Client API server endpoints (`/api/sessions/*`)
  - web UI behavior.

## Requirements

- **1. Canonical execute/result type map on client side**
  - Mirror the server-side actions map (see Task 32) in the **client runtime**:
    - For each action key (e.g. `rag-search`, `read-file`, `write-file`, `execute-command`, `script`, `form`, `message`, `capture-task`, etc.), define:
      - how it should be executed on the client (which package / service),
      - how its `result` should be encoded (action-key shape).
  - Implement this mapping in a single place in the Client API server / API client (e.g. `packages/api-client` + API server router), not scattered across web scripts.

- **2. Client API → Server protocol adapter**
  - Ensure Client API’s `/api/v1/invoke` proxy and `/api/v1/requests/*`:
    - always send/receive payloads in **canonical protocol format** (see JSON schemas),
    - normalize any legacy shapes (if still accepted) into action-key shape before passing to server,
    - expose a stable internal representation for web UI (sessions, execution, execute, finalResult).
  - Add tests that feed in example responses from simulations (`response.json`) and assert that:
    - Client API parses and stores them correctly in session state.
    - Outgoing requests back to server match `simulations/SCHEMA.md` expectations.

- **3. API Client helpers for simulations-based flows**
  - Extend or refine `@a2a/api-client` helpers so they:
    - Work naturally with **AI-Actions** flows (`dialog`, `coder`, `auto-ai`, `analyze`, `coder-smart`, `task-decomposition`) that use `execute.form`, `execute.message`, `execute.rag-search`, etc.
    - Provide high-level functions for:
      - sending **first task** (maps to `{ task }` request.json),
      - sending **form choice** (`result.choice`),
      - sending **message** (`result.message`),
      - sending **client action result** (e.g. `result["read-file"]`).
  - Use simulation examples in tests to assert that API client:
    - builds correct request bodies from high-level calls,
    - can replay a short simulation step sequence correctly against a mocked server.

- **4. Legacy format isolation / migration**
  - Identify all uses of:
    - `actions[]`, `proposedActions`, `subActions`, `executingAction`, `dslScript`, etc.
  - Wrap them behind **compatibility adapters** if still required, but ensure:
    - the new flows **never** depend on these fields,
    - all new code (Client API, web UI, API client) uses only:
      - `execute.form.choices` in first response,
      - action-key shape `execute` / `result` for all steps.

- **5. Integration tests using simulations**
  - For a subset of simulations (e.g. `dialog`, `coder`, `auto-ai`):
    - Use the real API client + Client API stack (in test mode),
    - Replay 2–3 steps per simulation with `LLM_REPLAY_DIR`,
    - Assert that:
      - the client executes the right local actions for each `execute.<action>`,
      - sends back `result` in action-key shape,
      - session states match expectations from `simulations/SCHEMA.md`.

## Acceptance Criteria

- A single, well-documented client-side **execute/result mapping** exists and covers all actions used in simulations.
- Client API server and API client:
  - never emit legacy shapes in new flows,
  - correctly handle AI-Actions and Actions flows as per protocol docs.
- Tests ensure that adding a new action to simulations fails CI unless client mapping/tests are extended.

## References

- `docs/new-request-flow/PROTOCOL.md`
- `docs/new-request-flow/API-CLIENT.md`
- `docs/new-request-flow/API-SERVER.md`
- `docs/new-request-flow/SESSION-FLOW.md`
- `simulations/SCHEMA.md`
- `simulations/*/description.md`

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 34) and recorded the client execute/result alignment needs.
- 📌 Implementation remains pending; this note will drive the client mapping work later.
- 📝 Next steps: coordinate client/server mapping tests once `tasks/EXECUTION-LOG.md` is updated with the full sequence.
