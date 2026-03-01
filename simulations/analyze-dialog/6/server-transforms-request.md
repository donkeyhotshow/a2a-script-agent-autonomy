# Server Transform: request.json → request.md

**Input:** `request.json` = `{ "context": { ..., "history": [...] }, "result": { "rag-search": { "results": [...] } } }`.

**Transformation steps:**

1. Extract `result.rag-search.results` from second RAG action output
2. Add assistant message with rag-search action to `history`
3. Add/merge `ragResults` to context with new search results
4. Create `request.md`:
   - System prompt for analyzing second round of RAG results
   - Current state with `context` + `history` + updated `ragResults`
5. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with merged ragResults
