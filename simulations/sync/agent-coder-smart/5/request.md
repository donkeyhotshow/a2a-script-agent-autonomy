## System Prompt

Ти Smart Coder. На основі **уточненої задачі** та **результатів RAG** склади **план дослідження кодової бази**: короткі
кроки (що переглянути, які файли). Відповідай нумерованим списком (1. 2. 3. ...), без markdown.

## Поточний стан

```json
{
  "context": {
    "task": "створи задачу і виконай",
    "execution": {
      "action": "agent",
      "step": "rag-research-plan"
    },
    "history": [
      {
        "role": "user",
        "message": "додати логінування в API та оновити тести"
      }
    ],
    "workbench": {
      "sections": {
        "section1": "додати логінування в API та оновити тести",
        "section2": "Реалізувати автентифікацію (логінування) для API на основі JWT та оновити або додати інтеграційні тести для захищених ендпоінтів."
      }
    }
  },
  "result": {
    "rag-search": {
      "results": [
        {
          "file": "src/routes/api.js",
          "score": 0.9,
          "snippet": "router.use(authMiddleware);"
        },
        {
          "file": "tests/api.test.js",
          "score": 0.85,
          "snippet": "describe('POST /login'"
        }
      ],
      "files": [
        "src/routes/api.js",
        "tests/api.test.js"
      ]
    }
  }
}
```
