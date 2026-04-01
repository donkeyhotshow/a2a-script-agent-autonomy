# Root DEV_STATE vs `work/STATE` queue

## Sources

- [`DEV_STATE.md`](../DEV_STATE.md) — **Pending tasks** / **Work queue** (still lists S10 only; **Completed work/tasks** claims S9 substeps etc.)
- [`work/STATE.md`](../work/STATE.md) — S9/S11/S12 **pending**, S14 **pending**, SYS backlog

## Agent prompt (copy)

Reconcile: one source of truth for “what is still open” (S10 optional, S14, SYS, any pending sync follow-ups). Prune duplicate or contradictory lines in root `DEV_STATE.md`; align dates and pointers to real `tasks/*.md` files after [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md) if applicable.

## Completion

- [ ] Done
