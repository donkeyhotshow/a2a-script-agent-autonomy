# Server: request → response (step 8)

**Input:** `request.json` =
`{ "context": { "execution": { "step": "search-exporter", "progress": { "currentFile": 3 } } }, "result": { "file": "...", "fixed": true, "patch": {...} } }`.

1. Parse `context.execution.step` = "search-exporter", progress, and `result`.
2. Validate: we have exporter file and patch for current file.
3. Apply patch: update file content with corrected import path.
4. Mark batch as complete: all files in current batch processed.
5. Next step: "vue-import-cleanup" - cleanup temporary files.
6. Build response: update `context.execution.step` = "vue-import-cleanup", add `finalResult`.
7. Execute action step: call `script` for cleanup.
8. Return `response.json` with `execute.script` and `finalResult`. No LLM needed.
