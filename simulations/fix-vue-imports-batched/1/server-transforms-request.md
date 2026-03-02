# Server: request → response (step 1)

**Input:** `request.json` = `{ "task": "..." }`.

1. Parse `task`; no `context` yet.
2. Match actions for this task. No-LLM actions (e.g. fix-vue-imports-batched) have higher priority; fallback (auto-ai,
   task-decomposition) require LLM. No LLM call here.
3. Build response: `context` = `{ task }`, `execute.form` with `choices`: no-LLM actions first, then fallbackActions
   merged (fix-vue-imports-batched → auto-ai → task-decomposition).
4. Return `response.json` (no `request.md`). Client replies with `result.choice`.
