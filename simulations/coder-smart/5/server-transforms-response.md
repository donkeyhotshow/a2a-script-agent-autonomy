# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = research plan (numbered list).

**Transformation steps:**

1. Extract text from `response.md` (research plan)
2. Build `response.json`:
    - `context`: preserve from request
    - `result`: research plan text
    - `execute`: next step - read-file or continue
3. Return `response.json` to client.

---

**Output:** `response.json` = context + result (research plan) + execute
