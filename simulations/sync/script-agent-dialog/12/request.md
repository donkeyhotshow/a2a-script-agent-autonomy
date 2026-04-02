# Step 12 — request (User asks for refactoring suggestions)

The user asks for refactoring suggestions for the component. **`12/request.json`** is canonical: full `context.task`, `context.execution` (`tests_complete`), full `context.history` (through `choice: add_tests` and Vitest summary), and `context.workbench.sections.autoScriptTrigger`.

```json
{
  "context": { "task": "…", "execution": { "action": "dialog", "step": "tests_complete" }, "history": [ "…" ], "workbench": { "sections": { "autoScriptTrigger": { "…" } } } },
  "result": { "message": "Какие улучшения можно сделать в Example.vue? Есть идеи по рефакторингу?" }
}
```

## System Prompt

You are a Vue.js expert. The user wants refactoring suggestions for their component. Provide actionable advice.

## Response Format

```json
{
  "context": { "execution": { "action": "dialog", "step": "refactoring" } },
  "result": { "message": "..." }
}
```

## Current State

```json
{
  "context": {
    "execution": { "action": "dialog", "step": "tests_complete" },
    "history": [
      { "message": "Vitest: 9 tests passed, Coverage: 85%", "role": "assistant" },
      { "message": "Какие улучшения можно сделать в Example.vue? Есть идеи по рефакторингу?", "role": "user" }
    ]
  },
  "result": { "message": "Какие улучшения можно сделать в Example.vue? Есть идеи по рефакторингу?" },
  "workbench": null
}
```

## Constraints

- Provide specific, actionable refactoring suggestions
- Focus on Vue best practices