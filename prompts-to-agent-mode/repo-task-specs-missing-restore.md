# Missing `tasks/*.md` specs (work/tasks removed)

## Sources

- [`work/STATE.md`](../work/STATE.md) — queue rows S7–S13 link to `tasks/sync-*.md`, `tasks/sync-form-choices-description.md`, etc.
- Repo tree: [`tasks/`](../tasks/) currently has only [`script-dialog-agent-response-parity.md`](../tasks/script-dialog-agent-response-parity.md) + [`README.md`](../tasks/README.md) (sync-* specs absent)
- Prompt files under this folder that still describe sync work: `work-task-sync-*.md` (their original copies lived in `work/tasks/`, directory removed)

## Agent prompt (copy)

Either **restore** the missing `tasks/sync-*.md` (and related) from git history into `tasks/`, **or** retarget `work/STATE.md` links to surviving docs (e.g. `simulations/sync/README.md`, `DEV_STATE.md` completed bullets) and delete stale markdown links. Ensure `prompts-to-agent-mode/README.md` source column matches real paths after restore.

## Completion

- [ ] Done
