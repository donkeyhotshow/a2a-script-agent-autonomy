# Server Transform: request.json → request.md

**Input:** `request.json` =
`{ "context": { "task": "створи задачу і виконай", "execution": { "action": "coder-smart", "step": "rag-clarify" } }, "result": { "rag-search": { "results": [...] } } }`.

**Transformation steps:**

1. Extract `result.rag-search.results` from RAG output
2. Add system message with rag-results to `history`
3. Create `request.md`:
    - System prompt for clarifying task from user request + RAG results
    - Current state with `context` + `history` + `ragResults`
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with ragResults for clarification
