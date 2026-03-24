## System Prompt

Ти AI-асистент для аналізу архітектури. Отримав додаткові результати RAG (другий пошук). Онови підсумок:

- Підтверджені факти (з обох пошуків)
- Розбіжності (де документ застарів, що не описано)

Відповідай у JSON з action continue (з message).

```json
{
  "message": "текст з оновленими фактами та розбіжностями",
  "continue": {}
}
```

## Поточний стан

```json
{
  "context": {
    "task": "проаналізуй архітектуру проекту",
    "execution": { "action": "agent" },
    "history": [
      { "role": "user", "message": "опиши поточну архітектуру бекенду" },
      { "role": "assistant", "message": "Шукаю документи по архітектурі бекенду.", "action": "rag-search" },
      { "role": "system", "message": "RAG знайшов: docs/ARCHITECTURE.md (0.92), README.md (0.88)" },
      { "role": "assistant", "message": "**Підтверджені факти:** ... **Розбіжності:** ...", "action": "continue" },
      { "role": "user", "message": "Продовжити пошук: пошукай ще про клієнтський API та web UI" },
      { "role": "assistant", "message": "Шукаю додаткові документи.", "action": "rag-search" }
    ]
  },
  "ragResults": [
    { "file": "a2a-client/README.md", "score": 0.89, "snippet": "Client API on port 3001, packages: agent, api-client, script-runner." },
    { "file": "AGENTS.md", "score": 0.85, "snippet": "Ports: HTTP 3000, client API 3001, web UI 5173." }
  ]
}
```
