# Router Transform

## Overview

Router — это компонент, который определяет какой режим работы выбрать на основе запроса пользователя.

## Режимы работы

- **dialog**: Для обычных вопросов и общения
- **agent**: Для работы с кодом (поиск, редактирование, выполнение команд)
- **task-decomposition**: Для сложных задач требующих планирования

## Keyword-Based Routing

С версии 2.0 router использует keyword-based routing вместо LLM transform:

1. **При наличии keyword совпадений** — используются найденные actions как choices
2. **Без совпадений** — используются дефолтные choices (dialog, agent, task-decomposition)

### Пример

```
Task: "исправь vue импорты"
→ Находит action "fix-vue-imports" (score >= 0.3)
→ Возвращает choices с fix-vue-imports

Task: "привет"
→ Не находит совпадений
→ Возвращает дефолтные choices: dialog, agent, task-decomposition
```

## Файлы

- [`src/services/core/request-processor/action-request-processor.ts`](src/services/core/request-processor/action-request-processor.ts:211) — Keyword-based implementation

## Fallback Choices

```json
[
  { "id": "dialog", "label": "AI діалог з користувачем", "description": "..." },
  { "id": "agent", "label": "Agent (універсальний режим)", "description": "..." },
  { "id": "task-decomposition", "label": "Декомпозиція задачі", "description": "..." }
]
```

## API

### Request

```json
POST /api/v1/invoke
{
  "task": "hello"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "execute": {
      "form": {
        "title": "Оберіть спосіб виконання",
        "choices": [
          { "id": "dialog", "label": "...", "description": "..." },
          ...
        ]
      }
    }
  }
}
```
