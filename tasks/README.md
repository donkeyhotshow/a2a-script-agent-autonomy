# tasks/

Handoff between agent sessions. See `methodology/session-roles.md`.

- **`pending/`** — Session type 2 pulls work only from here.
- **`archive/`** — Session type 2 moves completed task files here.

Session type 1 (orchestrator) adds new tasks to `pending/` when blocked; Session type 2 executes and archives.
