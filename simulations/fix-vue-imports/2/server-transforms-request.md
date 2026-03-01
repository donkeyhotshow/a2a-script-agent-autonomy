# Server: request → response (step 2)

**Input:** `request.json` = `{ "context": { "task": "..." }, "result": { "choice": "fix-vue-imports" } }`.

1. Take `context` from request (client echoes previous response context).
2. From `result.choice` set `execution` = `{ "action": "fix-vue-imports", "step": "vue-import-detect" }`.
3. Build `execute.script` for first step (vue-import-detect): input rootDir, filePattern; output broken_imports[].
4. Return `response.json`: `context` (with execution) + `execute`. No LLM.
