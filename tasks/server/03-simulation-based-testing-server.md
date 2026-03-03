# Task 3: Simulation-based testing for a2a-server

## Goal

Design and document how to use `simulations/` to verify correctness of `a2a-server` behavior independently of Web and Client API.

## References

- Server code:
  - `a2a-server/src/routes/`
  - `a2a-server/src/services/`
  - `a2a-server/src/actions/definitions/`
  - `a2a-server/src/protocol/`
- Simulations:
  - `simulations/SCHEMA.md`
  - `simulations/REFERENCE.md`
  - All concrete simulations under `simulations/`
- Transform DSL:
  - `docs/new-request-flow/json-schemas/server-transform.schema.json`
- Protocol / schemas:
  - `docs/new-request-flow/PROTOCOL.md`
  - `docs/new-request-flow/SCHEMAS.md`
  - `docs/new-request-flow/SIMULATION-FORMAT.md`
  - JSON Schemas for invoke request/response:
    - `docs/new-request-flow/json-schemas/server-invoke-request.schema.json`
    - `docs/new-request-flow/json-schemas/server-invoke-response-first-form.schema.json`
    - `docs/new-request-flow/json-schemas/server-invoke-response-execute.schema.json`
    - `docs/new-request-flow/json-schemas/server-invoke-response-pending.schema.json`

## Work to perform

1. **Define server simulation runner**
   - Use existing test runner scripts in `a2a-server/scripts/`:
     - `a2a-server/scripts/sim-run.ts` - runs simulations against server
     - `a2a-server/scripts/sim-validate.ts` - validates simulation responses
   - Design additional test runner (Node script / test helper) that:
     - Iterates over `simulations/<sim>/**/request.json`.
     - For each step:
       - Sends `request.json` to `/api/v1/invoke` on a running `a2a-server` instance (or supertest in-process).
       - Applies any configured server-transform JSON if needed to reconcile differences.
       - Compares actual response with `response.json` in the simulation folder.
   - Clarify comparison rules:
     - Strict match for `context.task`, `context.execution`, `execute` keys and action-key shape.
     - Allowance for system-managed fields (`history`, `docVirtual`, timestamps) where documented.
2. **Classify simulations by coverage**
   - Map each simulation to what it exercises in the server:
     - Actions (hardcoded steps) — e.g. `fix-vue-imports`, `fix-vue-imports-batched`.
     - AI-Actions (LLM-driven) — e.g. `dialog`, `coder`, `coder-smart`, `auto-ai`, `task-decomposition`.
   - For each category, specify:
     - Which parts of `a2a-server/src/actions/definitions/*` and `src/services/*` should be covered.
     - What invariants are checked (context propagation, correct step transitions, correct execute mapping, correct finalResult).
3. **Asynchronous / promiseId flows**
   - For simulations that model async LLM flows (see `SIMULATION-LLM-PROXY.md`), define:
     - How to simulate External AI Hub or mock `/api/v1/requests/:id/status` and `/api/v1/requests/:id/result`.
     - How to assert that server:
       - Returns `promiseId` and `status: "pending"` when expected.
       - Later returns a completed result matching simulation `response.json`.
4. **Document server testing process**
   - Create or extend a doc in `docs/new-request-flow/` that explains:
     - How to run server simulation tests (commands, environment variables).
     - How to add a new simulation to the test matrix.
     - How to debug mismatches between server responses and simulation expectations.

## Acceptance criteria

- A clear plan and documented process for:
  - Replaying all simulations directly against `a2a-server`.
  - Verifying responses match the expected JSON and schemas.
  - Covering both Actions and AI-Actions, including async/promiseId flows.
- Identified locations for test runner code and any necessary server test helpers.

