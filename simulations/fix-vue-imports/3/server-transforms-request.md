# Server: request → response (step 3)

**Input:** `request.json` = `{ "context": { ..., "execution": { "action": "fix-vue-imports", "step": "vue-import-detect" } }, "result": { "broken_imports": [...] } }`.

1. Take `context` from request.
2. From current `execution.step` (vue-import-detect) and `result.broken_imports`, advance to `execution.step` = `"vue-import-resolve"`.
3. Build `execute.script` for vue-import-resolve: input = broken_imports + aliases; output patches[].
4. Return `response.json`: updated context + execute. No LLM.
