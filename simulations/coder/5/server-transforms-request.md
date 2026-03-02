# Server Transform: request.json → request.md

**Input:** `request.json` =
`{ "context": { ..., "history": [...] }, "result": { "read-file": { "path": "...", "content": "..." } } }`.

**Transformation steps:**

1. Extract `result.read-file.path` and `result.read-file.content` from read-file action output
2. Add assistant message with read-file action to `history`
3. Add file content to context
4. Create `request.md`:
    - System prompt for answering based on file content
    - Current state with `context` + `history` + file content
5. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with file content
