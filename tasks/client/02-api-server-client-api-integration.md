# Client Task 02: Client API Server – Integration with New Engine & Protocol

## Goal

Align `a2a-client/packages/api-server` (Client API) with:

- the new server engine (request/response pipeline, promiseId),
- the canonical protocol shapes,
- and the simulations,

so that Web UI talks only to Client API, and Client API correctly proxies and interprets all server responses.

## Scope

Packages:
- `a2a-client/packages/api-server`
- integration points with `@a2a/api-client`

## Requirements

- **Protocol proxy correctness**
  - For `/api/v1/invoke` and `/api/v1/requests/*` proxies:
    - ensure all payloads sent to server match `server-invoke-request.schema.json`,
    - ensure responses from server are passed back in canonical shapes:
      - first response: `context` + `execute.form.choices`,
      - follow-ups: `context` + `execute` (+ `finalResult?`),
      - pending: `{ promiseId, status: "pending" }`.

- **Session model**
  - Update internal session model to track:
    - `context` (from server),
    - `execute` (last from server),
    - `status` (per `SESSION-FLOW.md`),
    - `exchangeLog[]` and `messages[]` (see Client Task 37).
  - Expose a clean DTO to Web via `/api/sessions/*` that hides server internals but preserves:
    - task, status, context.execution,
    - messages list,
    - current `execute` (for UI).

- **PromiseId flow**
  - Fully support asynchronous flows:
    - when server returns `{ promiseId, status: "pending" }`, store it and start polling `/api/v1/requests/:id/status` / `result`.
    - propagate progress and final `response` to Web via:
      - HTTP responses from `/api/sessions/:id/next`,
      - and SSE/WebSocket events if configured.

- **Simulation alignment**
  - Add tests that:
    - use Client API + mocked server responses from simulations (`response.json`),
    - verify that:
      - sessions evolve exactly as `SESSION-FLOW.md` describes,
      - the shape returned to Web for `dialog`, `coder`, and `auto-ai` matches expectations derived from these sims.

## References

- `docs/new-request-flow/API-SERVER.md`
- `docs/new-request-flow/SESSION-FLOW.md`
- `docs/new-request-flow/PROTOCOL.md`
- `simulations/SCHEMA.md`
- `a2a-client/packages/api-server/src/index.ts`

