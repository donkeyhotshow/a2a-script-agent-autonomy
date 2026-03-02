# Server: request → response (step 4)

**Input:** `request.json` =
`{ "context": { ..., "execution": { "step": "vue-import-resolve" } }, "result": { "patches": [...] } }`.

1. Take `context` from request.
2. Advance `execution.step` to `"vue-import-apply"`.
3. Build `execute.script` for vue-import-apply: input = patches; output fixed_files[].
4. Return `response.json`: updated context + execute. No LLM.
