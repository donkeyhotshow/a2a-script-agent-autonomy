# Client Task 10: fs-utils – read-file, write-file, list-directory protocol alignment

## Goal

Align `@a2a/fs-utils` with protocol and simulations so that:

- File operations used by Client API (when handling `execute["read-file"]`, `execute["write-file"]`, `execute["list-directory"]`) produce and consume **action-key result shapes**.
- API server can call fs-utils and directly embed results into `result["read-file"]`, `result["write-file"]`, `result["list-directory"]` for server/LLM.

## Scope

- `a2a-client/packages/fs-utils`
- Integration points in `a2a-client/packages/api-server` (routes that perform file ops)

## Requirements

- **Result shapes (action-key)**
  - **read-file:** `result["read-file"]` = `{ path: string, content: string }` (and optional encoding/error).
  - **write-file:** `result["write-file"]` = `{ path: string, written: boolean }` or equivalent as in simulations.
  - **list-directory:** `result["list-directory"]` = `{ path: string, entries: Array<{ name, type?, size? }> }` as used in coder/auto-ai.
  - Provide helpers or ensure existing API returns objects that match these shapes (no flat `content` without `path`).

- **Safety and policy**
  - Respect allowed directories and path restrictions (client policy / Task 39); reject paths outside workspace.
  - Optional: max file size for read, allowed extensions for write/list (e.g. from policy).

- **Tests**
  - Use examples from `simulations/coder`, `simulations/auto-ai` (read-file, write-file, list-directory steps):
    - assert fs-utils output can be used as `result["read-file"]` / `result["write-file"]` / `result["list-directory"]` without transformation,
    - assert path validation rejects out-of-scope paths.

## References

- `docs/new-request-flow/PROTOCOL.md`
- `simulations/SCHEMA.md`
- `simulations/REFERENCE.md`
- `simulations/coder/description.md`
- `a2a-client/packages/fs-utils`
- Client Task 02 (api-server uses fs-utils)
