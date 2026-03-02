# Server: request → response (step 5)

**Input:** `request.json` =
`{ "context": { ..., "execution": { "step": "vue-import-apply" } }, "result": { "fixed_files": [...] } }`.

1. Take `context` from request.
2. Advance `execution.step` to `"vue-import-cleanup"`, set `execution.status` = `"completed"`.
3. Build `execute.script` for last step (vue-import-cleanup) and `finalResult`: action summary (broken_imports_found,
   patches_resolved, files_fixed, cleanup_count).
4. Return `response.json`: updated context + execute + finalResult. No LLM.
