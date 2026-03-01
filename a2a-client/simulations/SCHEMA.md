# Client simulation schema

Use these fixtures to validate that the client sends the correct payload after each server response.

## Rules

1. **Echo context** — client always sends back the `context` from the last server response (unchanged).
2. **Form with choices** — client sends `result.choice` (id of selected option). Optional: `result.message`, `result.path` if form has those inputs.
3. **Form with message only** — client sends `result.message`.
4. **execute.script** — client runs script, then sends `result` with the output shape (e.g. `result.broken_imports`, `result.patches`, `result.fixed_files`).
5. **execute["read-file"]** — client sends `result["read-file"]`: `{ "path", "content" }`.
6. **execute["rag-search"]** — client sends `result["rag-search"]`: `{ "results": [...], "files": [...] }`.
7. **execute["write-file"]** — client writes file, then sends e.g. `result["write-file"]`: `{ "path", "ok": true }` or similar.

When server sent `actions[]` (legacy), client sends `result.action`. When server sent `execute.form` with choices, client sends `result.choice`.
