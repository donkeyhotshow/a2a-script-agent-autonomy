# Server Transform: request.json → request.md

**Input:** `request.json` = `{ "context": { ..., "history": [...] }, "input": { "message": "дякую!" } }`.

**Transformation steps:**

1. Extract `input.message` from user response
2. Add user message to `history`
3. Create `request.md`:
   - System prompt for closing conversation
   - Current state with `context` + `history`
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with user thanks message
