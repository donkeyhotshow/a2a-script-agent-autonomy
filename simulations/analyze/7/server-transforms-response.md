# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = `{ "message": "...", "write-file": { "path": "...", "content": "..." } }`.

**Transformation steps:**

1. Parse LLM JSON output from `response.md`
2. Extract `message` and `write-file` fields
3. Build `response.json`:
    - `context`: preserve from request
    - `result`: LLM response (message + write-file details)
    - `execute.write-file`: path and content for file creation
    - `finalResult`: action summary (report saved)
4. Return `response.json` to client.

---

**Output:** `response.json` = context + result + execute.write-file + finalResult
