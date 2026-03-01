# Server Transform: request.json → request.md

**Input:** `request.json` = `{ "context": { ..., "history": [...] }, "input": { "message": "запиши весь звіт в docs/auth-report.md" } }`.

**Transformation steps:**

1. Extract `input.message` with write-file request
2. Add user message to `history`
3. Create `request.md`:
   - System prompt for generating report file
   - Current state with `context` + `history` + file contents
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context for write-file action
