# Step 12 — request (User asks for refactoring suggestions)

The user asks for refactoring suggestions for the component.

```json
{
  "context": {
    "execution": { "action": "dialog", "step": "tests_complete" },
    "history": [
      { "message": "Ошибка импорта", "role": "user" },
      { "message": "Автоматический скрипт применил патч", "role": "assistant" },
      { "message": "Vitest: 9 tests passed, Coverage: 85%", "role": "assistant" }
    ]
  },
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