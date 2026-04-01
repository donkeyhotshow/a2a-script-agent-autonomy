# Classify / track a2a-client test failures (historical)

## Sources

- **Spec (missing on disk):** `tasks/analyze-test-failures.md` — see [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md); classification already in [`DEV_STATE.md`](../DEV_STATE.md)
- [`a2a-client/DEV_STATE.md`](../a2a-client/DEV_STATE.md)

## Agent prompt (copy)

Task file marks analysis **completed** (41 failures = config). Use this prompt only if re-auditing: run `cd a2a-client && npm test`, re-bucket failures, update `DEV_STATE` tables. For fixing config, prefer [`dev-state-client-test-failures.md`](dev-state-client-test-failures.md).

## Completion

- [ ] Done (re-audit if needed)
