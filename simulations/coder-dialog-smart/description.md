# coder-dialog-smart Simulation

## Опис

Діалогова симуляція для створення MD документу контексту задачі. Поєднує:
- Формат діалогу з coder-dialog
- Логіку створення контексту з ai-session-context.md (capture-task → analyze-intent → llm-first-iteration → create-context-document)

## Workflow

| Step | Опис |
|------|------|
| 1 | User відправляє задачу |
| 2 | Сервер повертає доступні дії |
| 3 | User обирає coder-dialog |
| 4 | LLM аналізує задачу → capture-task + analyze-intent |
| 5 | LLM створює план вивчення (llm-first-iteration) |
| 6 | LLM генерує MD документ |
