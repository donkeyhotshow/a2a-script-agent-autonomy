# Server: request → response (step 2)

**Input:** `request.json` = `{ "context": { "task": "..." }, "result": { "action": "fix-vue-imports-batched" } }`.

1. Parse `context.task` and `result.action`.
2. Validate action: `fix-vue-imports-batched` - this is a no-LLM action.
3. Extract first step from action definition: `search-vite-file`.
4. Build response: `context.execution` = `{ action: "fix-vue-imports-batched", step: "search-vite-file" }`.
5. Execute action step: call `search` with pattern `vite.config.{js,ts,mjs,cjs}`.
6. Return `response.json` with `execute.search`. No LLM needed.
