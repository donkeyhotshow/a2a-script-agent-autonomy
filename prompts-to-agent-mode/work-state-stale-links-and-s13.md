# `work/STATE.md`: fix stale task links + S13 reference

## Sources

- [`work/STATE.md`](../work/STATE.md) — queue table (S9–S14, SYS); `tasks/*.md` links in the table should resolve (see [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md) for specs intentionally not committed). Also scan root `README.md`, `methodology/tasks.md`, and shell headers for dead `docs/troubleshooting/` or `proposals/` paths.
- [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md)

## Agent prompt (copy)

Update `work/STATE.md`: replace dead `tasks/*.md` links with real paths (after restore from git) or with inline “done — see DEV_STATE / sims README” notes. For S13: link to the sim fixes or archive line—no broken markdown.

## Completion

- [x] Done (stale links cleared and S13 coverage recorded; see `repo-task-specs-missing-restore.md` for restored specs)
