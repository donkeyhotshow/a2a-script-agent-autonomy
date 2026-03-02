# Server: request → response (step 2)

**Input:** `request.json` = `{ "context": { "task": "..." }, "result": { "choice": "analyze" } }`.

1. Take `context` from request (client echoes previous response context).
2. From `result.choice` set `execution` = `{ "action": "analyze", "step": "analyze-architecture" }`.
3. Build `execute.form` to ask user for analysis parameters.
4. Return `response.json`: `context` (with execution) + `execute`. No LLM.
