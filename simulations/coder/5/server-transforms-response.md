# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = `{ "message": "...", "action": "continue" }`.

**Transformation steps:**

1. Parse LLM JSON output from `response.md`
2. Extract `message` and `action` fields
3. Build `response.json`:
   - `context`: preserve from request (with updated history)
   - `result`: LLM response (message with explanation)
   - `execute`: empty (dialog continues, client waits for user input)
4. Return `response.json` to client.

---

**Output:** `response.json` = context + result (no execute, waiting for user)
