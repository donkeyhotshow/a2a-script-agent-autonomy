# S10: Router drift (optional)

## Sources

- [`DEV_STATE.md`](../DEV_STATE.md) — **Pending tasks** / **Work queue**: S10 router drift (optional)
- [`work/STATE.md`](../work/STATE.md) — row S10, link to task spec
- Router drift spec: [work-task-sync-documentation-router-drift.md](work-task-sync-documentation-router-drift.md) (on-disk task `.md` missing — [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md))
- [`shared/router-static-choices.json`](../shared/router-static-choices.json)

## Agent prompt (copy)

Align sync simulation router `execute.form.choices` with `shared/router-static-choices.json` (stable ids; label/description parity). Re-run `npm run sim:lint -- --all` and `npm run sim:validate -- --all` from repo root per `AGENTS.md`. Update `DEV_STATE.md` and the task spec when done.

## Completion

- [ ] Done
