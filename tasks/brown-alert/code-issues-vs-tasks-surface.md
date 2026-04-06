# Distill: `code-issues/` vs `tasks/pending/`

## Artifact

- **Path:** [`code-issues/`](../../code-issues/) — ~33 markdown files, static scan findings; [`code-issues/README.md`](../../code-issues/README.md) lists tracks and a table.

## Why (Brown)

**Parallel backlog** next to `tasks/pending/` risks duplicate tickets and unclear ownership.

## Actions

1. **Add** a short rule in [`tasks/README.md`](../../tasks/README.md) or [`DEV_STATE.md`](../../DEV_STATE.md): when an item moves from `code-issues/` → `tasks/pending/` (or is fixed in place).
2. **Triage** high-severity items (security/auth) into real `tasks/pending/*.md` or ADR follow-ups; **close** stale rows in `code-issues/README.md`.
3. **Optional:** script or note to detect `code-issues/*.md` with no matching task (or vice versa).

## Done when

Contributors know which surface to use; critical issues are not only in `code-issues/`.
