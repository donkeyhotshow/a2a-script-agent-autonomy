# Task 04: Simulation Migration Gate

## Atomic update action
Update simulation docs and fixtures whenever client/session DTO shape changes, with mandatory lint/validate gates.

## Reason
Runtime and simulation drift breaks contract confidence; client data-shape changes must always be mirrored in golden fixtures.

## Affected files
- `simulations/SCHEMA.md`
- `a2a-client/docs/WEB_UI_PROTOCOL.md`
- `a2a-client/docs/session-management-protocols.md`

## Validation checklist
- Run `npm run sim:lint -- --all --json` from repo root (or `cd a2a-server` equivalent).
- Run `npm run sim:validate -- --sim <changed-sim> --json`.
- Ensure `received.json` stays projection DTO and `response.json` stays canonical single-action-key format.
