# Client actions (execute.*) — full map

All actions the LLM/agent can request (ai-action flow: next step from LLM response; separate request per step possible).
The client must support each via `execute.<action>` and return `result.<action>` with the described shape.

## Canonical rule

`execute` is an object: **key = action type**, value = params. Client replies with `result: { "<action>": { ... } }` (
action-key shape). See `simulations/SCHEMA.md`.

---

## Covered by simulation / client today

| Action              | Params (execute)                                                           | Result (client → server)                                                                                 | Status            |
|---------------------|----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|-------------------|
| **form**            | `{ "input": [{ "name", "type", "label", "required" }] }` or `form.choices` | `result.message`, `result.choice`, `result.path`                                                         | ✅ In sim          |
| **rag-search**      | `{ "query": "..." }`                                                       | `result["rag-search"]`: `{ "results": [{ "file", "score", "snippet" }], "files": [] }`, optional `query` | ✅ In sim          |
| **read-file**       | `{ "path": "..." }`                                                        | `result["read-file"]`: `{ "path", "content" }`                                                           | ✅ In sim          |
| **write-file**      | `{ "path": "...", "content": "..." }`                                      | `result["write-file"]`: `{ "path", "success", "bytesWritten"? }`                                         | ✅ In sim          |
| **execute-command** | `{ "command": "npm test" }`                                                | `result["execute-command"]`: `{ "command", "exitCode", "stdout", "stderr" }`                             | ✅ In sim          |
| **script**          | `{ "input", "output", "code" }` (DSL)                                      | `result["script"]` or step result                                                                        | ✅ fix-vue-imports |

---

## To cover (future)

| Action             | Params (execute)                                                   | Result (client → server)                                                    | Notes                                      |
|--------------------|--------------------------------------------------------------------|-----------------------------------------------------------------------------|--------------------------------------------|
| **list-directory** | `{ "path": "src/", "pattern"?: "*.js" }`                           | `result["list-directory"]`: `{ "path", "entries": [{ "name", "type": "file" | "dir" }] }`                                | fs/list, scan; LLM explores tree |
| **grep-search**    | `{ "pattern": "regex or text", "path"?: "src/", "glob"?: "*.ts" }` | `result["grep-search"]`: `{ "matches": [{ "file", "line", "text" }] }`      | Text search across files; LLM finds usages |
| **file-exists**    | `{ "path": "..." }`                                                | `result["file-exists"]`: `{ "path", "exists": true                          | false }`                                   | fs/exists; LLM checks before read/write |
| **scan-directory** | `{ "path": "...", "glob"?: "**/*.vue" }`                           | `result["scan-directory"]`: `{ "path", "files": ["..."] }`                  | fs/scan; list files by pattern             |
| **edit-patch**     | `{ "path": "...", "patch": "..." }` or diff format                 | `result["edit-patch"]`: `{ "path", "success" }`                             | Apply patch instead of full write          |
| **run-script**     | `{ "scriptId", "args"?: {} }`                                      | `result["run-script"]`: `{ "exitCode", "stdout", "stderr" }`                | Run predefined script (e.g. lint, test)    |

---

## Summary

- **In this simulation (auto-ai):** form, rag-search, read-file, write-file, execute-command (+ completed).
- **In other sims:** script (fix-vue-imports).
- **Planned:** list-directory, grep-search, file-exists, scan-directory, edit-patch, run-script — to be implemented on
  client and wired so LLM can request them via `execute.<action>`.

When adding a new action: (1) define in this map, (2) add to `simulations/SCHEMA.md` execute examples and result
shape, (3) implement client handler, (4) optionally add a step in auto-ai or a dedicated sim.
