# `work/STATE.md`: fix stale task links + S13 reference

## Sources

- [`work/STATE.md`](../work/STATE.md) — queue table (S9–S14, SYS); rows point at `tasks/sync-*.md` etc.; most of those files are **missing** from [`tasks/`](../tasks/)
- [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md)

## Agent prompt (copy)

Update `work/STATE.md`: replace dead `tasks/*.md` links with real paths (after restore from git) or with inline “done — see DEV_STATE / sims README” notes. For S13: link to the sim fixes or archive line—no broken markdown.

## Completion

- [ ] Done
