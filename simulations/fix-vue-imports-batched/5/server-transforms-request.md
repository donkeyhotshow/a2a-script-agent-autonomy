# Server: request → response (step 5)

**Input:** `request.json` = `{ "context": { "execution": { "step": "request-files-to-fix" } }, "result": { "broken_imports_count": 50 } }`.

1. Parse `context.execution.step` = "request-files-to-fix" and `result.broken_imports_count`.
2. Validate: we have list of broken imports (stored locally for batched processing).
3. Extract file list from local storage.
4. Update `context.files_to_fix` with batched file list.
5. Next step: "search-exporter" - find exporter for first broken import.
6. Build response: update `context.execution.step` = "search-exporter", add progress info.
7. Execute action step: call `rag-search` with query to find exporter file.
8. Return `response.json` with `execute.rag-search`. No LLM needed.
