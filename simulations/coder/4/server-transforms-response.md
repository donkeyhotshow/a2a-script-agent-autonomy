# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = `{ "message": "...", "action": "read-file", "params": { "file": "..." } }`.

**Transformation steps:**

1. Parse LLM JSON output from `response.md`
2. Extract `message`, `action`, and `params` fields
3. Map action to execute format (read-file, rag-search, continue)
4. Build `response.json`:
    - `context`: preserve from request
    - `result`: LLM response
    - `execute`: mapped action
5. Return `response.json` to client.

---

**Output:** `response.json` = context + result + execute (read-file)
