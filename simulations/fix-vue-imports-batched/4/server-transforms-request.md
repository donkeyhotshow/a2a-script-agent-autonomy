# Server: request → response (step 4)

**Input:** `request.json` = `{ "context": { "execution": { "step": "request-vite-file" } }, "result": { "file": "...", "content": "..." } }`.

1. Parse `context.execution.step` = "request-vite-file" and `result.file`, `result.content`.
2. Validate: we have Vite config content.
3. Extract aliases from config: parse resolve.alias.
4. Update `context.vite_config` and `context.aliases`.
5. Next step: "request-files-to-fix" - scan for broken imports.
6. Build response: update `context.execution.step` = "request-files-to-fix".
7. Execute action step: call `search` with pattern `**/*.vue`.
8. Return `response.json` with `execute.search`. No LLM needed.
