# Two-session agent contract (strict)

**Do not mix these roles in one chat session.** Another session will not “listen” to mixed instructions; hand off only via files under `tasks/`.

## Session type 1 — Orchestrator / bring-up

1. **Start the stack** using repo batch scripts (e.g. root `start-all.bat`, or `scripts/start-*.bat` as needed). Do not rely on the web UI to start services.
2. **Control the system only via the Client API** on the dev server (`http://localhost:5173/api/a2a/...` — sessions, `next`, `async`, etc.). **Do not** drive work through the browser UI for this role.
3. **Use task documents** under `tasks/` as the definition of work: iterate (health checks, API calls, fixes) until the system runs and goals in those tasks are met.
4. **If you hit product/code defects** you cannot finish in-session: investigate briefly, then **write new task files** under `tasks/` (e.g. `tasks/pending/<slug>.md` or structured JSON alongside existing conventions), including repro, expected behavior, and acceptance criteria.
5. **End the session** after bring-up and/or task authoring. Do not also act as Session type 2 in the same session.

## Session type 2 — Executor / queue drain

1. **Only** execute work described by files already in `tasks/` (typically `tasks/pending/`).
2. **Do not** start full-stack bring-up or exploratory API iteration unless a pending task explicitly requires it.
3. When a task is **done**, **move** its file to `tasks/archive/` (keep filename or prefix with `YYYY-MM-DD-` for traceability).
4. **End the session** when assigned pending tasks are finished or the pending queue is empty.

## Folder layout

| Path | Role |
|------|------|
| `tasks/pending/` | Incoming work for Session type 2 |
| `tasks/archive/` | Completed task specs (moved from pending) |

## Related

- API surface: root `AGENTS.md` (Client API table).
- Modes (work/debug): `methodology/transitions.md`, `methodology/mode1.md`, `methodology/mode2.md`.
