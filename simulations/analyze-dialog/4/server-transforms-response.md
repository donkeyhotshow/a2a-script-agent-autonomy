# Server Transform: response.md → response.json

**Input:** `response.md` = LLM response = `{ "message": "...", "continue": {} }`.

**Transformation steps:**

1. Parse LLM JSON output from `response.md`
2. Extract `message`, `continue`, or `read-file` fields
3. Build `response.json`:
   - `context`: preserve from request (with updated history)
   - `result`: LLM response (message with analysis)
   - `execute`: map LLM output to execute (continue, read-file, or finalResult if done)
4. Return `response.json` to client.

---

**Output:** `response.json` = context + result + execute (e.g., execute.continue or execute.finalResult)
