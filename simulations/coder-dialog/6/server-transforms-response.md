# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = `{ "message": "...", "action": "completed" }`.

**Transformation steps:**

1. Parse LLM JSON output from `response.md`
2. Extract `message` and `action` fields
3. Build `response.json`:
   - `context`: preserve from request
   - `result`: LLM response (closing message)
   - `finalResult`: action summary (coder-dialog completed)
4. Return `response.json` to client.

---

**Output:** `response.json` = context + result + finalResult (completed)
