# Step 12 — response (LLM provides refactoring suggestions)

LLM provides actionable refactoring recommendations with a choice form.

```json
{
  "context": { "execution": { "action": "dialog", "step": "refactoring" } },
  "execute": {
    "form": {
      "title": "Рефакторинг",
      "choices": [
        { "id": "all", "label": "Все сразу" },
        { "id": "typescript", "label": "Только TypeScript" },
        { "id": "composables", "label": "Extract composables" },
        { "id": "none", "label": "Пропустить" }
      ]
    }
  }
}
```