# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = `{ "message": "...", "continue": {} }`.

**Transformation steps:**

1. Parse LLM JSON output from `response.md`
2. Extract `message`, `continue`, or other action fields
3. Build `response.json`:
   - `context`: preserve from request (with updated history)
   - `result`: LLM response (message with updated analysis)
   - `execute`: check if analysis is complete → execute.finalResult, else execute.continue
4. Return `response.json` to client.

---

**Output:** `response.json` = context + result + execute (finalResult or continue)
