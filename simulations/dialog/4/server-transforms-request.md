# Server Transform: request.json → request.md

**Input:** `request.json` = `{ "context": { ..., "history": [...] }, "result": { "message": "Дякую!" } }`.

**Transformation steps:**

1. Extract `context.execution` to determine action type
2. Build `history` array: add `result.message` as user message to existing history
3. Create `request.md`:
   - System prompt from action definition
   - Current state with `context` + `history` (now includes user + assistant messages)
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with updated history
