# Server Transform: request.json → request.md

**Input:** `request.json` =
`{ "context": { ..., "docVirtual": {...} }, "result": { "rag-search": { "results": [...] } } }`.

**Transformation steps:**

1. Extract `result.rag-search.results` and `context.docVirtual`
2. Add system message with rag-results to `history`
3. Create `request.md`:
    - System prompt for creating research plan
    - Current state with `context` + `docVirtual` + `ragResults`
4. Return `request.md` (markdown) to send to LLM.

---

**Output:** `request.md` = system prompt + context with docVirtual and ragResults
