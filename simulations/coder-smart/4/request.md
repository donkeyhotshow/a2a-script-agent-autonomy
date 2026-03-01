## System Prompt

Ти Smart Coder. На основі **запиту користувача** та **результатів RAG-пошуку** сформуй **уточнену формулювання** задачі (1–3 речення). Відповідай лише текстом уточненої формулювання, без заголовків і розмітки.

## Поточний стан

```json
{
  "context": {
    "task": "створи задачу і виконай",
    "execution": {
      "action": "coder-smart",
      "step": "rag-clarify"
    },
    "history": [
      {
        "role": "user",
        "message": "додати логінування в API та оновити тести"
      }
    ]
  },
  "message": "додати логінування в API та оновити тести",
  "ragResults": [
    { "file": "src/auth.js", "score": 0.92, "snippet": "async function login(email, password) { ... }" },
    { "file": "src/middleware/auth.ts", "score": 0.88, "snippet": "export function verifyToken(token: string) { ... }" }
  ]
}
```
