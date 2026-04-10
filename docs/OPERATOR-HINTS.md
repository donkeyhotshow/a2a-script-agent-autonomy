# Operator Hints Catalog

## Purpose

Provide short, actionable hints for operators who verify agent work after Task Monitor runs.

## Canonical Loop

1. Run monitor (`npm run monitor` or `npm run monitor:once`).
2. Export completed mapping (`npm run monitor:completed:json`).
3. Manually verify session/promise signals.
4. Record evidence in `DEV_STATE.md`.
5. Convert gaps into `tasks/pending/`.

Primary protocol: [docs/OPERATOR-MONITOR-MANUAL-QA.md](./OPERATOR-MONITOR-MANUAL-QA.md).

## Batch Mode (Recommended)

Use small batches (`1-3` prompts), then pause for manual QA:

1. Run `npm run monitor:once`.
2. Verify one processed prompt end-to-end.
3. Log evidence and next actions.
4. Repeat.

For larger queue burn, use `npm run monitor` but still perform QA checkpoints every few completed prompts.

## Symptom -> Hint -> Link

| Symptom | Hint | Source |
|---|---|---|
| Session stuck at router | Re-open session state and apply two-beat rule (`message` vs `choice`) on the same `sessionId`. | [docs/OPERATOR-CURL.md](./OPERATOR-CURL.md), [docs/AGENTS-REFERENCE.md](./AGENTS-REFERENCE.md) |
| Async never settles | Continue `/async` polling, inspect hub promise queue/errors, generate promise report. | [MONITOR-QUICK-START.md](../MONITOR-QUICK-START.md), [scripts/promise-artifacts-report.mjs](../scripts/promise-artifacts-report.mjs) |
| Contract/shape drift | Run offline direct tests/validators before another live run. | [tests/direct-tests/README.md](../tests/direct-tests/README.md), [tests/direct-tests/validators/README.md](../tests/direct-tests/validators/README.md) |
| Queue looks empty | Run prune -> discover -> write tasks, then monitor again. | [AGENTS.md](../AGENTS.md), [tasks/README.md](../tasks/README.md) |
| Not sure which tests to run | Pick commands from operator matrix by scope, then log pass/fail in state. | [docs/OPERATOR-TESTING-MATRIX.md](./OPERATOR-TESTING-MATRIX.md) |
| Need startup/restart decision | Follow system startup policy; avoid full restart after normal edits. | [docs/SYSTEM_STARTUP.md](./SYSTEM_STARTUP.md) |

## Evidence Checklist (Per Finding)

1. `sessionId` (and `promiseId` when available).
2. Terminal signal (`completed` / `failed` / `timeout`).
3. One checked condition (what was verified manually).
4. Follow-up task link if failure/gap exists.
5. `DEV_STATE.md` entry with date/time and command(s).
