# a2a-client: 41 failed tests (SDK / Vitest config)

## Sources

- [`DEV_STATE.md`](../DEV_STATE.md) — **Pre-existing issues**
- [`a2a-client/DEV_STATE.md`](../a2a-client/DEV_STATE.md) — Pre-existing Issues table
- Historical spec (restore if needed): `tasks/analyze-test-failures.md` — [`tasks/ide-prompts/repo-task-specs-missing-restore.md`](../tasks/ide-prompts/repo-task-specs-missing-restore.md)

## Agent prompt (copy)

Fix a2a-client Vitest/SDK configuration so the 41 tests currently failing with “No test suite found” / runner errors are either wired correctly or explicitly excluded with documented reason. Run `cd a2a-client && npm test`. Update `a2a-client/DEV_STATE.md` and root `DEV_STATE.md` when the failure count changes.

## Completion

[X] Completed
