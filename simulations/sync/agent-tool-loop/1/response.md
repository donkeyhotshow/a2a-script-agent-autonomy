# `agent-tool-loop/1` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "зчитати файл і знайти функцію",
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
      "description": "LLM адаптується до вашої задачі.",
      "choices": [
        {
          "id": "dialog",
          "label": "AI діалог з користувачем",
          "description": "Вільний текстовий діалог з моделлю без інструментів коду."
        },
        {
          "id": "agent",
          "label": "Agent (універсальний режим)",
          "description": "Агент з інструментами: пошук по коду, файли, команди."
        },
        {
          "id": "task-decomposition",
          "label": "Декомпозиція задачі",
          "description": "Розбиття задачі на підзадачі та план виконання."
        },
        {
          "id": "fix-vue-imports",
          "label": "Виправлення Vue imports",
          "description": "Скриптований сценарій для виправлення імпортів у Vue."
        },
        {
          "id": "fix-laravel-namespaces-and-uses",
          "label": "Laravel: namespace та use",
          "description": "Скриптований сценарій для PHP namespace та use."
        }
      ]
    }
  },
  "result": {
    "completed": false
  }
}
```
