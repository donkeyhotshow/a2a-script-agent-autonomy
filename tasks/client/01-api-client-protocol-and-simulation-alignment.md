# Client Task 01: API Client – Protocol & Simulation Alignment

## Goal

Align `@a2a/api-client` with the **new protocol** and **simulations pipeline**, so that:

- All client → server calls use the canonical shapes from `docs/new-request-flow/PROTOCOL.md`.
- High-level helpers can drive simulation-style flows (`dialog`, `coder`, `auto-ai`, `task-decomposition`, `coder-smart`) without manual JSON wiring.

## Scope

Packages:
- `a2a-client/packages/api-client`

## Requirements

- **Protocol alignment**
  - Ensure all public methods (`invoke`, `createRequest`, `waitForResult`, etc.) construct payloads that satisfy:
    - `server-invoke-request.schema.json`
    - `server-invoke-response-*.schema.json`
  - Normalize legacy shapes (if any) into:
    - first response: `execute.form.choices` (no `actions[]`),
    - execute/result: **action-key shape** only.

- **Simulation helpers**
  - Add small, focused helpers for simulation-like flows:
    - `invokeFirstTask(task: string, options?)` → `{ context, execute.form.choices | pending }`.
    - `sendFormChoice(context, choiceId, extra?)` → next response.
    - `sendMessage(context, message: string)` → next response (AI-Actions).
  - These should be thin wrappers around `invoke`, but make it easy for tests and Client API to stay consistent with simulations.

- **Types & action map**
  - Re-export protocol-derived types (`a2a-server/src/types/protocol.generated.ts`) via `@a2a/types` where appropriate, and consume them in API client instead of ad-hoc types.
  - Mirror the canonical actions map (Task 32) on the client: define a type-safe enum / union of known `execute` keys used by simulations.

- **Tests**
  - For at least `dialog`, `coder`, `auto-ai`:
    - use real API client to build `request` bodies from the new helpers,
    - assert they match `simulations/*/request.json` (up to allowed normalization).
  - Assert responses from a mocked server (using `simulations/*/response.json`) round-trip cleanly through API client helpers.

## References

- `docs/new-request-flow/PROTOCOL.md`
- `docs/new-request-flow/API-CLIENT.md`
- `simulations/SCHEMA.md`
- `a2a-client/packages/api-client/src/index.ts`
- `a2a-client/packages/api-client/src/protocol.ts`

