# Agent - Coder Flow

Поглощает симуляции `coder`, `coder-smart`, `coder-smart-v2`.

## Тип: Unified Agent

Это вариация Agent режима с фокусом на кодирование.

## Опис

User: "додай роут /health"

Agent:
- step: analyze → execute → review
- write-file с кодом
- execute-command для проверки

## Потік

| Крок | Client | Server Response |
|------|--------|-----------------|
| 1 | task: "допоможи з кодом" | execute.form (router) |
| 2 | choice: "agent" | execute.form (message) |
| 3 | message: "додай роут /health" | step: plan, rag-search |
| 4 | rag-search result | step: analyze, read-file |
| 5 | read-file result | step: analyze, list-directory |
| 6 | list-directory result | step: execute, write-file |
| 7 | write-file result | step: review, execute-command |
| 8 | execute-command result | step: dialog |
| 9 | message: "дякую" | completed |
