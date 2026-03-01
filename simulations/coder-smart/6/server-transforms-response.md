# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = checklist (markdown list).

**Transformation steps:**

1. Extract text from `response.md` (checklist)
2. Build `response.json`:
   - `context`: preserve from request
   - `result`: checklist text
   - `execute`: proceed to write-file with checklist
3. Return `response.json` to client.

---

**Output:** `response.json` = context + result (checklist) + execute.write-file
