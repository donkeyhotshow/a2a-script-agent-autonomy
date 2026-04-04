## System Prompt

Ти AI-асистент для аналізу архітектури. Користувач обрав «Зберегти звіт». Збери з історії діалогу підсумок (всі
підтверджені факти та розбіжності) і поверни один JSON з write-file: path та content (Markdown). Шлях уже заданий у
result.path.

Відповідай у JSON:

```json
{
  "context": {
    "task": "проаналізуй архітектуру проекту",
    "execution": {
      "action": "agent",
      "step": "7"
    },
    "history": [
      {
        "role": "user",
        "message": "опиши поточну архітектуру бекенду"
      },
      {
        "role": "assistant",
        "message": "Шукаю документи по архітектурі бекенду.",
        "action": "rag-search"
      },
      {
        "role": "system",
        "message": "RAG знайшов: docs/ARCHITECTURE.md, README.md"
      },
      {
        "role": "assistant",
        "message": "**Підтверджені факти:** ... **Розбіжності:** ...",
        "action": "continue"
      },
      {
        "role": "user",
        "message": "Продовжити пошук: пошукай ще про клієнтський API та web UI"
      },
      {
        "role": "assistant",
        "message": "Шукаю додаткові документи.",
        "action": "rag-search"
      },
      {
        "role": "system",
        "message": "RAG знайшов: a2a-client/README.md, AGENTS.md"
      },
      {
        "role": "assistant",
        "message": "**Підтверджені факти (оновлено):** ... **Розбіжності:** ...",
        "action": "continue"
      }
    ]
  },
  "result": {
    "choice": "save_report",
    "path": ".carrier/reports/architecture-report.md"
  }
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
      { "role": "system", "message": "RAG знайшов: docs/ARCHITECTURE.md, README.md" },
      { "role": "assistant", "message": "**Підтверджені факти:** ... **Розбіжності:** ...", "action": "continue" },
      { "role": "user", "message": "Продовжити пошук: пошукай ще про клієнтський API та web UI" },
      { "role": "assistant", "message": "Шукаю додаткові документи.", "action": "rag-search" },
      { "role": "system", "message": "RAG знайшов: a2a-client/README.md, AGENTS.md" },
      { "role": "assistant", "message": "**Підтверджені факти (оновлено):** ... **Розбіжності:** ...", "action": "continue" }
    ]
  },
  "result": { "choice": "save_report", "path": ".carrier/reports/architecture-report.md" }
}
```
