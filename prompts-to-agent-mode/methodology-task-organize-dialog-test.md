# Organize / fix dialog test (methodology queue)

## Sources

- [`archive/methodology/tasks.md`](../../archive/methodology/tasks.md) — table row #1 (In Progress: dialog stuck though AI says OK)
- [`archive/methodology/mode2.md`](../../archive/methodology/mode2.md) — diagnostic mode
- [`AGENTS.md`](../../AGENTS.md) — Client API path, router two-beat

## Agent prompt (copy)

Reproduce the dialog failure with a real Client API session (`POST /sessions`, `/next`, poll `/async`). Capture step artifacts under `a2a-client/storage/sessions/`. Fix root cause or file a testable `tasks/pending/` item + `DEV_STATE.md` update. Mark row #1 in `archive/methodology/tasks.md` Done or current.

## Completion

- [ ] Done
