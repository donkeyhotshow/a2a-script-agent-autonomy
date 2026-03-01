# Server: request → response (step 6)

**Input:** `request.json` = `{ "context": { "execution": { "step": "search-exporter", "progress": { "currentFile": 1 } } }, "result": { "file": "...", "fixed": true, "patch": {...} } }`.

1. Parse `context.execution.step` = "search-exporter", progress, and `result`.
2. Validate: we have exporter file and patch for current file.
3. Apply patch: update file content with corrected import path.
4. Increment progress: `currentFile: 2`.
5. Next step: continue "search-exporter" for next file.
6. Extract next file from batch list.
7. Build response: update `context.execution.step` = "search-exporter", update progress.
8. Execute action step: call `rag-search` with query for next exporter.
9. Return `response.json` with `execute.rag-search`. No LLM needed.
