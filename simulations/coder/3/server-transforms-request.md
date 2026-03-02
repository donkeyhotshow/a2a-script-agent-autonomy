# Server Transform: request.json → request.md

**Input:** `request.json` =
`{ "context": { "task": "допоможи розібратись з кодом", "execution": { "action": "coder" } }, "result": { "message": "як працює система авторизації?" } }`.

**Transformation steps:**

1. Extract `result.message` from client response
2. Build `history` array: add user message
3. Create `request.md`:
    - System prompt from coder action definition
    - Current state with `context` + `history`
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with user message in history
