# Server Transform: request.json → request.md

**Input:** `request.json` = `{ "context": { ..., "history": [...] }, "result": { "success": true, "path": "docs/auth-report.md", "bytesWritten": 1847 } }`.

**Transformation steps:**

1. Extract `result` (write-file success: path, bytesWritten)
2. Add assistant message with write-file action to `history`
3. Create `request.md`:
   - System prompt for final confirmation
   - Current state with `context` + `history` + result
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with write-file result
