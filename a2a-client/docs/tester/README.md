# Tester Docs (Red-Room Focus)

This section is focused on validating red-room execution and session correctness only.

## Priority Scope

1. Session lifecycle consistency during tester-driven runs
2. Execute payload correctness (action-key shape)
3. Async behavior and recovery (`promiseId`, polling, finalization)

## Core Documents

- [API.md](./API.md) - tester endpoint contract
- [INTEGRATION.md](./INTEGRATION.md) - web client integration behavior
- [../api-testing-plan.md](../api-testing-plan.md) - end-to-end session checks

## Red-Room Validation Targets

- A command or user result produces expected `request-to-server.json`
- The next step produces `server-response.json` (or `server-promise.json` first)
- `/api/a2a/sessions/{id}` rebuilds state from step artifacts
- `/api/a2a/sessions/{id}/async` resolves pending async work safely

## Notes

- If docs mention deprecated transport assumptions as the main flow, treat them as historical.
- Session and step-file correctness is the source of truth for acceptance.