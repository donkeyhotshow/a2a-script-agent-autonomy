# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = `{ "result": "...", "updatedTaskDoc": "..." }`.

**Transformation steps:**

1. Extract `result` and `updatedTaskDoc` from LLM response
2. Build `response.json`:
    - `context`: preserve from request
    - `result`: execution result
    - `execute`: write-file with updated task doc, or continue to next item
3. Return `response.json` to client.

---

**Output:** `response.json` = context + result + execute (write-file or continue)
