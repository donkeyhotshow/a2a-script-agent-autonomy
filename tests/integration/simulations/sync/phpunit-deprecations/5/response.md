# `phpunit-deprecations/5` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "знайти застарілі PHPUnit методи",
    "workbench": {
      "sections": {}
    },
    "execution": {
      "action": "phpunit-deprecations",
      "step": "completed"
    },
    "history": [
      {
        "role": "system",
        "step": "scan-phpunit",
        "status": "completed",
        "result": {
          "total": 45
        }
      },
      {
        "role": "system",
        "step": "detect-deprecations",
        "status": "completed",
        "result": {
          "deprecations": 2
        }
      },
      {
        "role": "system",
        "step": "generate-deprecations-report",
        "status": "completed",
        "result": {
          "report": {
            "status": "generated"
          }
        }
      }
    ]
  },
  "execute": {
    "form": {
      "title": "Результат пошуку PHPUnit депрекацій",
      "description": "Знайдено 2 застарілі методи, які потрібно виправити у файлах тестів.",
      "choices": [
        {
          "id": "done",
          "label": "OK",
          "description": "Завершити виконання"
        }
      ]
    }
  }
}
```
