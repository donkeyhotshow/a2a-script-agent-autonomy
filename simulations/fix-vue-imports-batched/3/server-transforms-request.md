# Server: request → response (step 3)

**Input:** `request.json` = `{ "context": { "execution": { "step": "search-vite-file" } }, "result": { "vite_config_files": [...] } }`.

1. Parse `context.execution.step` = "search-vite-file" and `result.vite_config_files`.
2. Validate: we have results from previous step (search completed).
3. Next step: "request-vite-file" - read content of first config file found.
4. Build response: update `context.execution.step` = "request-vite-file".
5. Execute action step: call `read-file` with path from results.
6. Return `response.json` with `execute.read-file`. No LLM needed.
