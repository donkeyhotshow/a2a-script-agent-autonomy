# Operator Testing Matrix

## Purpose

Define deterministic test entry points for operator verification across Client API, server contracts, monitor flows, simulations, and a2a-ai-hub.

## Contract

### Inputs

- Repository root with dependencies installed.
- Running stack only when a command explicitly requires live services.
- `.env` values aligned with project rules (including test key/db constraints from `AGENTS.md`).

### Outputs

- Pass/fail evidence for the selected verification scope.
- Reproducible command history suitable for `DEV_STATE.md`.
- Clear escalation target when a gate fails.

### Side effects

- Reads/modifies generated artifacts (session audit tasks, monitor state, temporary test outputs).
- Some commands may read live session storage and hub/server request storage.

### Assumptions

- Operator uses Client API contour as normative execution path.
- Async polling contract remains mandatory (no sync workaround).

### Constraints

- Do not declare production-ready closure from a single happy-path session.
- Do not skip monitor evidence when validating indexed prompt flows.

### Ambiguities

- Interpretation A: “testing complete” after one successful manual session.
- Interpretation B: “testing complete” only after scope-appropriate gates pass and evidence is logged.
- Selected interpretation: B.

## Client / SDK / Web / Storage Facts (Operator)

1. Web UI uses same-origin Client API (`/api/a2a/*`), not direct browser calls to `:3000`.
Source: [a2a-client/docs/WEB_UI_PROTOCOL.md](../a2a-client/docs/WEB_UI_PROTOCOL.md).

2. `POST /api/a2a/sessions/{id}/next` is ack-first (`accepted`, `step`, `asyncPending`) and does not expose transport `promiseId`.
Source: [a2a-client/docs/WEB_UI_PROTOCOL.md](../a2a-client/docs/WEB_UI_PROTOCOL.md), [a2a-client/docs/api-testing-plan.md](../a2a-client/docs/api-testing-plan.md).

3. Polling for web/session flows is `GET /api/a2a/sessions/{id}/async`; session-level `promiseStatus` is from `GET /sessions/{id}` and is not the same field.
Source: [a2a-client/docs/WEB_UI_PROTOCOL.md](../a2a-client/docs/WEB_UI_PROTOCOL.md).

4. `GET /api/a2a/sessions/{id}?includeContext=1` can be blocked in production (403); use for debug in dev.
Source: [a2a-client/docs/WEB_UI_PROTOCOL.md](../a2a-client/docs/WEB_UI_PROTOCOL.md).

5. `GET /api/a2a/sessions/{id}/messages` delta route can return 404 in project storage mode; use `GET /sessions/{id}` snapshot there.
Source: [a2a-client/docs/WEB_UI_PROTOCOL.md](../a2a-client/docs/WEB_UI_PROTOCOL.md).

6. Session artifact expectations per completed step: `client-result.json`, `request-to-server.json`, `server-response.json`, `messages.json`; `server-promise.json` must exist only while pending.
Source: [a2a-client/docs/api-testing-plan.md](../a2a-client/docs/api-testing-plan.md).

## Test Matrix (Run from Repo Root)

| Goal | Command | Live stack required | Notes |
|---|---|---|---|
| Monitor contract regression | `npm run test:monitor` | No | Validates monitor behavior and central entry contract tests. |
| Direct shape checks | `npm run test:direct-tests` | No | Fast schema/action-key focused suite. |
| Validator scans (targeted) | `npm run scan-promise-bodies` / `npm run scan-session-responses` / `npm run verify:gray-room` | No | Offline artifact/contract checks. |
| Server+indirect baseline | `npm run test:before-start` | Mostly no | Runs indirect + server unit + monitor + session-storage verify chain. |
| Cross-system contract check | `npm run cross-system:validate` | No | Validates cross-layer parameter/shape assumptions. |
| Sim quality gates | `npm run sim:check-md:fail` + `npm run sim:lint:all` + `npm run sim:validate -- --all` | No | Required when simulation surfaces or docs/schema change. |
| One prompt live verification | `npm run monitor:once` | Yes | Produces prompt -> session evidence. |
| Daemonized queue run | `npm run monitor` | Yes | Long-running queue burn. |
| Completed mapping export | `npm run monitor:completed:json` | No | Use `merged` as source-of-truth map. |
| Promise incident triage | `npm run report:promise -- <promiseId> --logs` | No | Collects request/session/proxy evidence in one report. |

## Component-Specific Test Entrypoints

| Component | Command(s) |
|---|---|
| Root orchestration | `npm run test:monitor`, `npm run test:direct-tests`, `npm run test:before-start` |
| a2a-client | `npm --prefix a2a-client run test:client-api`, `npm --prefix a2a-client run test:web`, `npm --prefix a2a-client run test:e2e` |
| a2a-server | `npm --prefix a2a-server run test`, `npm --prefix a2a-server run sim:lint:all`, `npm --prefix a2a-server run sim:validate:all` |
| a2a-ai-hub (python) | `python -m pytest a2a-ai-hub/tests` |

## Production-Ready Test Gate (Operator Summary)

1. Offline gates pass for affected scope (`test:monitor`, direct-tests/validators, and sim/cross-system where relevant).
2. Live monitor evidence exists for indexed prompt behavior (`monitor` or `monitor:once` + completed mapping).
3. Any failed gate has an explicit blocker entry and follow-up task (`tasks/pending/` + `DEV_STATE.md`).
