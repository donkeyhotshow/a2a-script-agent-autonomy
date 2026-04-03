# `fix-vue-imports-batched/1` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "task",
      "step": "router"
    },
    "workbench": {
      "sections": {}
    }
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "description": "LLM modes and scripted actions; pick one to continue.",
      "choices": [
        {
          "id": "fix-vue-imports-batched",
          "label": "Виправити зламані імпорти у Vue файлах (пакетна обробка)",
          "description": "Batch processing of Vue 2→3 import fixes across multiple files"
        },
        {
          "id": "dialog",
          "label": "AI діалог з користувачем",
          "description": "Free-form chat; follow-up forms in later steps."
        },
        {
          "id": "auto-ai",
          "label": "AI Action Generator",
          "description": "LLM proposes executable actions from session context."
        },
        {
          "id": "auto-ai-v2",
          "label": "Auto-AI v2",
          "description": "Agent loop with optimized context (files, scratchpad, system history)."
        },
        {
          "id": "task-decomposition",
          "label": "Декомпозиція задачі",
          "description": "Split a goal into ordered subtasks and track progress."
        },
        {
          "id": "coder",
          "label": "Робота з кодом (Coder)",
          "description": "RAG, read/write files, and forms for coding tasks."
        },
        {
          "id": "coder-smart",
          "label": "Coder smart",
          "description": "Structured coder flow with clarifying steps."
        },
        {
          "id": "coder-smart-v2",
          "label": "Coder smart v2",
          "description": "Virtual task doc, .carrier/tasks file, checklist execution."
        },
        {
          "id": "analyze",
          "label": "Аналіз коду",
          "description": "Explain and inspect code without applying edits."
        },
        {
          "id": "fix-vue-imports",
          "label": "Виправлення Vue imports",
          "description": "Scripted Vue 2→3 import fixes (no LLM)."
        }
      ]
    }
  }
}
```
