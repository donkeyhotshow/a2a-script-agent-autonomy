# Server Transform: request.json → request.md

**Input:** `request.json` = `{ "context": { "task": "диалог", "execution": { "action": "dialog", "step": "request" } }, "result": { "message": "hello world" } }`.

**Transformation steps:**

1. Extract `context.execution` to determine action type
2. Build `history` array from `result` (add user message)
3. Create `request.md`:
   - System prompt from action definition
   - Current state with `context` + `history`
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with history
