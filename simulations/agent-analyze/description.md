# Agent - Analyze Flow

Поглощает симуляцию `analyze`.

## Тип: Unified Agent

Это вариация Agent режима с фокусом на анализ.

## Опис

User: "проаналізуй архітектуру проекту"

Agent:
- step: analyze — поиск, чтение, анализ
- write-file только для отчета (не кода)

## Потік

| Крок | Client | Server Response |
|------|--------|-----------------|
| 1 | task: "проаналізуй архітектуру" | execute.form (router) |
| 2 | choice: "agent" | execute.form (message) |
| 3 | message: "опиши архітектуру" | step: analyze, rag-search |
| 4 | rag-search result | step: analyze, read-file |
| 5 | read-file result | step: dialog, form (продовжити/зберегти) |
| 6 | choice: "continue" | step: analyze, rag-search |
| 7 | rag-search result | step: dialog, form |
| 8 | choice: "save_report" | step: execute, write-file |
| 9 | write-file result | completed |
