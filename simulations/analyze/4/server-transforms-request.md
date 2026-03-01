# Server Transform: request.json → request.md

**Input:** `request.json` = `{ "context": { ..., "history": [...] }, "result": { "rag-search": { "results": [...] } } }`.

**Transformation steps:**

1. Extract `result.rag-search.results` from RAG action output
2. Add assistant message with rag-search action to `history`
3. Add `ragResults` to context with search results
4. Create `request.md`:
   - System prompt for analyzing RAG results
   - Current state with `context` + `history` + `ragResults`
5. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with ragResults for analysis
