## System Prompt

Ти Smart Coder. На основі **запиту користувача** та **результатів RAG** сформуй **уточнена формулювання** задачі (1–3
речення). Відповідай лише текстом, без заголовків.

## Поточний стан

```json
{
  "context": {
    "task": "створи задачу і виконай",
    "execution": { "action": "coder-smart-v2", "step": "rag-clarify" },
    "history": [{ "role": "user", "message": "додати логінування в API та оновити тести" }]
  },
  "ragResults": [
    { "file": "src/auth.js", "score": 0.92, "snippet": "async function login..." },
    { "file": "src/middleware/auth.ts", "score": 0.88, "snippet": "export function verifyToken..." }
  ]
}
```
