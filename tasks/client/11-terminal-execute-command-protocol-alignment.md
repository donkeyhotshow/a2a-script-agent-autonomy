# Client Task 11: terminal – execute-command protocol alignment

## Goal

Align `@a2a/terminal` with protocol and simulations so that:

- Command execution used by Client API (when handling `execute["execute-command"]`) returns the **action-key result shape** expected by the server.
- Safety and limits (allowed commands, timeouts, cwd) follow client policy (Task 39).

## Scope

- `a2a-client/packages/terminal`
- Integration in `a2a-client/packages/api-server` (terminal/execute routes)

## Requirements

- **Result shape (action-key)**
  - `result["execute-command"]` = `{ command: string, exitCode: number, stdout: string, stderr: string }` (and optional duration, cwd).
  - Ensure terminal module (or the api-server adapter that calls it) returns exactly this shape so it can be sent to the server without remapping.

- **Safety and policy**
  - Respect client-side policy: allowed commands or blocklist, working directory restriction, max execution time, max output size.
  - Reject or sandbox dangerous patterns (e.g. rm -rf /, arbitrary code execution) per Task 39.

- **Tests**
  - Use examples from `simulations/auto-ai`, `simulations/coder` where `execute["execute-command"]` is used:
    - run a representative command via @a2a/terminal,
    - assert output matches `result["execute-command"]` structure expected in response.json.

## References

- `docs/new-request-flow/PROTOCOL.md`
- `simulations/SCHEMA.md`
- `simulations/REFERENCE.md`
- `simulations/auto-ai/description.md`
- `a2a-client/packages/terminal`
- Client Task 02, Task 39
