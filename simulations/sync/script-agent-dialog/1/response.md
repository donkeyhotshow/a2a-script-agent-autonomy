# Step 1 — response (router form)

Mirror of `response.json`: static tail matches `shared/router-static-choices.json` (ids + UA copy); description notes the script-agent-dialog scenario.

```json
{
  "context": {
    "task": "script-agent-dialog: auto run fix-vue-imports when agent flags import errors.",
    "workbench": {
      "sections": {}
    },
    "execution": {
      "action": "task",
      "step": "router"
    }
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "description": "script-agent-dialog: dialog that auto-applies fix-vue-imports when the assistant flags import errors. (Static tail ids match shared/router-static-choices.json.)",
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
  }
}
```
