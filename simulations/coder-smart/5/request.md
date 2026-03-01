## System Prompt

Ти Smart Coder. На основі **уточненої задачі** та **результатів RAG** склади **план дослідження кодової бази**: короткі кроки (що переглянути, які файли). Відповідай нумерованим списком (1. 2. 3. ...), без markdown.

## Поточний стан

```json
{
  "context": {
    "task": "створи задачу і виконай",
    "execution": { "action": "coder-smart", "step": "rag-research-plan" },
    "docVirtual": {
      "section1": "додати логінування в API та оновити тести",
      "section2": "Реалізувати автентифікацію (логінування) для API на основі JWT та оновити або додати інтеграційні тести."
    }
  },
  "ragResults": [
    { "file": "src/routes/api.js", "snippet": "router.use(authMiddleware);" },
    { "file": "tests/api.test.js", "snippet": "describe('POST /login'" }
  ]
}
```
