# Server: request → response (step 2)

**Input:** `request.json` = `{ "context": { "task": "..." }, "result": { "choice": "coder" } }`.

1. Take `context` from request (client echoes previous response context).
2. From `result.choice` set `execution` = `{ "action": "coder", "step": "coder" }`.
3. Initialize `history` = `[]`.
4. Build `execute.form` to ask user for message input.
5. Return `response.json`: `context` (with execution + history) + `execute`. No LLM.
