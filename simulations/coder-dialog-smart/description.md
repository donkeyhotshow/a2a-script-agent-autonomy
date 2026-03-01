# coder-dialog-smart Simulation

## Опис

Симуляція показує діалог з AI-асистентом який:
- Починає як звичайний coder-dialog
- Автоматично створює контекст задачі (capture-task + analyze-intent)
- Генерує план вивчення (llm-first-iteration)
- Створює MD документ контексту (create-context-document)

Це комбінація:
- `coder-dialog` - діалоговий формат
- `ai-session-context.md` - автоматичне створення контексту

## Workflow

| Step | Request | Response |
|------|---------|----------|
| 1 | task | actions |
| 2 | result.actionId: "coder-dialog" | execute.form |
| 3 | input.message | LLM → capture-task + analyze-intent |
| 4 | result | execute: llm-first-iteration |
| 5 | input.message | LLM → study_plan |
| 6 | result | execute: create-context-document |
| 7 | result | context_document (MD) + completed |
