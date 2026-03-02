# Server: request → response (step 2)

**Input:** `request.json` = `{ "context": { "task": "..." }, "result": { "choice": "task-decomposition" } }`.

1. Take `context` from request (client echoes previous response context).
2. From `result.choice` set `execution` = `{ "action": "task-decomposition", "step": "decompose-task" }`.
3. Build `execute.form` to ask user for task description.
4. Return `response.json`: `context` (with execution) + `execute`. No LLM.
