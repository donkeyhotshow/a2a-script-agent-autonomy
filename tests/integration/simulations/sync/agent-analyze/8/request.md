# `agent-analyze/8` — request

Mirror of `request.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "проаналізуй архітектуру проекту",
    "execution": {
      "action": "agent",
      "step": "8"
    },
    "history": [
      {
        "role": "user",
        "message": "опиши поточну архітектуру бекенду"
      },
      {
        "role": "assistant",
        "message": "Шукаю документи...",
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
      },
      {
        "role": "user",
        "message": "Зберегти звіт у .carrier/reports/"
      },
      {
        "role": "assistant",
        "message": "Зберігаю звіт.",
        "action": "write-file"
      }
    ]
  },
  "result": {
    "write-file": {
      "path": ".carrier/reports/architecture-report.md",
      "success": true
    }
  }
}
```
