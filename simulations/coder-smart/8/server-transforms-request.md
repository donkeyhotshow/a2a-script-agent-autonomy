# Server Transform: request.json → request.md

**Input:** `request.json` =
`{ "context": { ..., "execution": { "step": "execute-item" } }, "result": { "message": "<full task doc content>" } }`.

**Transformation steps:**

1. Extract `result.message` (full task document content)
2. Add user message with task doc to `history`
3. Create `request.md`:
    - System prompt for executing first unchecked item from checklist
    - Current state with `context` + `history` + task doc
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with task doc for execution
