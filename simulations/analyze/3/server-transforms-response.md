# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = `{ "message": "...", "rag-search": { "query": "..." } }`.

**Transformation steps:**

1. Parse LLM JSON output from `response.md`
2. Extract `message`, `rag-search`, `read-file`, or `continue` fields
3. Build `response.json`:
   - `context`: preserve from request
   - `result`: LLM response fields
   - `execute`: map LLM output to execute actions (rag-search, read-file, etc.)
4. Return `response.json` to client.

---

**Output:** `response.json` = context + result + execute (e.g., execute.rag-search)
