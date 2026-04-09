# `agent-analyze/8` — response

Mirror of `response.json` for prompt pipeline / `sim:check-md`.

```json
{
  "context": {
    "task": "проаналізуй архітектуру проекту",
    "execution": {
      "action": "agent",
      "step": "completed"
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
      },
      {
        "role": "system",
        "message": "Файл .carrier/reports/architecture-report.md записано."
      }
    ],
    "workbench": {
      "sections": {}
    }
  },
  "execute": {
    "form": {
      "title": "Продовжити або зберегти звіт",
      "description": "Уточніть запит для пошуку або закріпіть усі поточні факти у звіті.",
      "choices": [
        {
          "id": "continue_search",
          "label": "Продовжити пошук",
          "description": "Додати нові ключові слова або уточнення, щоб знайти додаткові згадки."
        },
        {
          "id": "save_report",
          "label": "Зберегти звіт у .carrier/reports/",
          "description": "Завершити аналіз і записати підтверджені факти у файл звіту."
        }
      ],
      "input": [
        {
          "name": "message",
          "type": "text",
          "label": "Запит для пошуку (якщо продовжуєте)",
          "required": false
        },
        {
          "name": "path",
          "type": "text",
          "label": "Шлях (за замовч. .carrier/reports/architecture-report.md)",
          "required": false,
          "placeholder": ".carrier/reports/architecture-report.md"
        }
      ]
    }
  }
}
```
