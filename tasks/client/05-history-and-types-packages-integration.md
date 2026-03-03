# Client Task 05: History & Types Packages Integration with New Flow

## Goal

Integrate `@a2a/history` and `@a2a/types` with the new protocol, simulations, and Client API/Web session model, so that:

- session history storage on the client is consistent with `exchangeLog[]` / `messages[]`,
- shared types for protocol, actions, and sessions are reused across client packages.

## Scope

Packages:
- `a2a-client/packages/history`
- `a2a-client/packages/types`

## Requirements

- **History package integration**
  - Extend or adapt `@a2a/history` to:
    - store and retrieve session logs in the new structure (`exchangeLog[]`, `messages[]`),
    - support both in-memory and file-based storage for Client API sessions.
  - Provide helpers for:
    - appending a new step (with request/response + md fields),
    - reconstructing `messages[]` from the log (if not already present).

- **Types alignment**
  - Ensure `@a2a/types` includes:
    - protocol-level types generated from `schema/protocol.json` / `a2a-server/src/types/protocol.generated.ts`,
    - shared action-type definitions (execute/result action keys),
    - session DTO types used by Web (`SessionSummary`, `SessionDetail` with `messages[]`, `execute`, etc.).
  - Refactor client packages (API client, API server, web where reasonable) to use these shared types instead of ad-hoc ones.

- **Tests**
  - Add tests that:
    - use `@a2a/history` to record a multi-step session and then reload it, verifying:
      - log integrity,
      - message reconstruction.
    - compile a small sample client + server interaction entirely using types from `@a2a/types`, ensuring no type drift.

## References

- `a2a-client/packages/history/src/*.ts`
- `a2a-client/packages/types/src/*.ts`
- `a2a-server/src/types/protocol.generated.ts`
- Client Tasks 02 and 37 for session/log model

