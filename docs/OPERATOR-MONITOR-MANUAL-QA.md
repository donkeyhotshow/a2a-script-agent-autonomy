# Operator Monitor + Manual QA Protocol

## Purpose

Define a deterministic workflow for autonomous queue driving via Task Monitor plus mandatory manual verification of agent outputs.

## Canonical References

- Main protocol: [AGENTS.md](../AGENTS.md)
- Monitor operations: [MONITOR-QUICK-START.md](../MONITOR-QUICK-START.md)
- Session/router behavior: [docs/AGENTS-REFERENCE.md](./AGENTS-REFERENCE.md)
- Manual API path (debug): [docs/OPERATOR-CURL.md](./OPERATOR-CURL.md)
- Triage model: [docs/TRIANGLE-WORKFLOW.md](./TRIANGLE-WORKFLOW.md)
- Evidence discipline: [docs/agent-iteration-traps.md](./agent-iteration-traps.md)
- Offline validators: [tests/direct-tests/validators/README.md](../tests/direct-tests/validators/README.md)
- Test commands and gate mapping: [docs/OPERATOR-TESTING-MATRIX.md](./OPERATOR-TESTING-MATRIX.md)
- Task lifecycle: [tasks/README.md](../tasks/README.md)
- State log: [DEV_STATE.md](../DEV_STATE.md)

## Contract

### Inputs

- `prompts-to-agent-mode/*.md` task queue.
- Runtime stack available through Client API and async endpoints.
- Local repository state (`DEV_STATE.md`, `tasks/pending/`, `tasks/completed/`).
- Monitor outputs (`task-monitor-state.json`, merged completion JSON, session artifacts).

### Outputs

- Completed monitor iterations with evidence (`sessionId`/`promiseId`, terminal status, verification notes).
- Updated `DEV_STATE.md` records and testable follow-up tasks in `tasks/pending/`.
- Linked operator hints to canonical docs and scripts.

### Side effects

- Runs Task Monitor sessions through Client API (`/sessions`, `/next`, `/async` polling).
- Writes monitor state and completion artifacts.
- Mutates `DEV_STATE.md` and task files.

### Assumptions

- Async-only transport policy is active.
- Task Monitor is the default queue driver.
- Manual checks are required before closure.

### Constraints

- Do not use ad-hoc `POST /sessions` loops for batch queue burn (debug-only).
- Do not close work without practical evidence.
- Empty queue is not a stop signal.
- This protocol excludes centralized orchestrator routine (`npm run central`) by current scope decision.
- “100% production-ready” means all acceptance gates in this document are green in the same iteration.

### Ambiguities

- Interpretation A: “manual verification” means only visual check in UI.
- Interpretation B: “manual verification” means evidence-backed check with ids, status, and artifact links.
- Selected interpretation: B, because it is testable and aligns with evidence-first rules.

## Quick Triage Table

| Symptom | First check | Action |
|---|---|---|
| Session stuck at router | `GET /sessions/{id}` message flow | Apply two-beat fix (`message` vs `choice`) on same session |
| Async remains pending | `GET /async` status + hub queue | Keep poll discipline, inspect queue errors, run promise report |
| Shape/contract drift | Offline validators | Fix contract first, then rerun monitor |
| “Empty queue” state | `DEV_STATE` + tasks pruning | Run prune/discover/write, then monitor again |
| Multiple layer uncertainty | Triangle classification | Classify A/B/C before edits |

## Color Alert Reminder (Operator)

- `Red`: run full monitor-driven cycle and do not stop after one turn.
- `Blue`: dialog/router contract suspicion (`message` vs `choice`).
- `Orange`: async discipline only (`/next` then poll `/async` until settled).
- `Gray`: server-first suspicion (transforms/execute/history merge).
- `Black`: hub/proxy/upstream suspicion.
- `Teal`: cross-layer contract/version drift.

Canonical alert definitions: [GLOSSARY.md](../GLOSSARY.md). Triangle usage: [docs/TRIANGLE-WORKFLOW.md](./TRIANGLE-WORKFLOW.md).

## Mandatory Workflow

1. Execute loop `Monitor -> Manual QA -> DEV_STATE update` on each run.

2. Use `npm run monitor` (continuous) or `npm run monitor:once` (single pass) as default queue driver.

3. After each pass, export completion artifacts:
- `npm run monitor:completed:json`
- `npm run monitor:completed`

4. Before closing any item, record manual evidence:
- `sessionId` and/or `promiseId`
- terminal signal (`completed` / `failed` / `timeout`)
- what was manually checked

5. For anomalies, build promise artifact report:
- `npm run report:promise -- <promiseId> --logs`
Reference: [scripts/promise-artifacts-report.mjs](../scripts/promise-artifacts-report.mjs).

6. Run offline validators before full e2e when contracts/forms can be affected.

7. If queue appears empty, execute mandatory sequence:
- prune state
- discover concrete work
- write tasks
- run monitor again

8. For stuck sessions, run router two-beat manual check (`message` vs `choice`) on same `sessionId`.

9. Maintain an operator hints document with direct links to runbooks and standard commands for fast agent nudging.

10. Convert each manual finding into a testable backlog artifact:
- add item in `tasks/pending/`
- add evidence note in `DEV_STATE.md`

11. Preserve async-only policy in operator hints and incident actions.

## Acceptance Criteria (100% Production-Ready)

1. Monitor pass completed with terminal evidence for processed items and exported completion artifacts.
2. Manual QA evidence recorded with ids, status, and explicit verification notes in `DEV_STATE.md`.
3. Contract/shape gates pass for impacted scope (validator or equivalent targeted check), and no unresolved P0 remains for this iteration.

If any criterion fails, the iteration is not production-ready and must remain open.

## Manual QA Checklist (Per Iteration)

### Must

1. Confirm monitor command and scope (`monitor` or `monitor:once`).
2. Capture ids (`sessionId`, `promiseId`) and terminal status.
3. Verify result shape/contract via validator or targeted check.
4. Write evidence + next action into `DEV_STATE.md`.
5. If gap discovered, create concrete task in `tasks/pending/`.

### Optional

1. Create anomaly artifact report when signal quality is low or investigation is needed.
2. Add operator hint link updates when new recurring failure pattern appears.

## Anti-Patterns (Do Not Do)

1. Do not burn indexed queue with ad-hoc `POST /sessions` loops.
2. Do not mark work complete without ids and terminal evidence.
3. Do not treat empty queue as completion; run prune/discover/write first.
4. Do not bypass async-only policy by introducing sync workaround paths.
5. Do not close monitor timeout incidents without router two-beat and promise queue checks.

## UI Switch (Client <-> Prototype)

1. In client web header, use `Interface` selector.
2. `Prototype UI` redirects to configured prototype URL and passes `clientUrl` for return path.
3. Configure prototype URL in `Settings -> Prototype UI URL` (default `http://localhost:3200`).
4. In prototype UI, use `Client UI` button to return.

Implementation task and evidence: [tasks/web-ui-client-prototype-toggle.md](../tasks/web-ui-client-prototype-toggle.md).
