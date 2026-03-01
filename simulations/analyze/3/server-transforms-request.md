# Server Transform: request.json → request.md

**Input:** `request.json` = `{ "context": { "task": "аналіз", "execution": { "action": "analyze" } }, "result": { "action": "analyze", "message": "опиши поточну архітектуру бекенду" } }`.

**Transformation steps:**

1. Extract `result.action` and `result.message` from client response
2. Build `history` array: add user message with chosen action
3. Create `request.md`:
   - System prompt from `analyze` action definition
   - Current state with `context` + `history`
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt for analyze + context with history
