# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = `{ "message": "hello world" }`.

**Transformation steps:**

1. Parse LLM JSON output from `response.md`
2. Extract `message` field
3. Build `response.json`:
    - `context`: preserve from request
    - `result.message`: LLM response
    - `execute`: empty (dialog just returns message, no further action)
4. Return `response.json` to client.

---

**Output:** `response.json` = context + result.message
