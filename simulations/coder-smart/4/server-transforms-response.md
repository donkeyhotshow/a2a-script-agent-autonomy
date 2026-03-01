# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = clarified task description (text).

**Transformation steps:**

1. Extract text from `response.md` (clarified task)
2. Build `response.json`:
   - `context`: preserve from request
   - `result`: clarified task description
   - `execute`: next step - rag-search for implementation plan
3. Return `response.json` to client.

---

**Output:** `response.json` = context + result (clarified task) + execute.rag-search
