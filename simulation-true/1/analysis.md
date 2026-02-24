# Simulation True 1 - Analysis

## Workflow: Action Found in Database

### Request (Client → Server)

Клиент отправляет задачу:
```json
{
  "action": "task_request",
  "task": "исправить импорты в vue компонентах",
  "context": { ... }
}
```

### Process (Server Side)

1. **Поиск экшена в базе**
   - Искать в `a2a-server/src/actions/`
   - Использовать семантический поиск (RAG)
   - Найден: `fix-vue-imports` (matchScore: 0.95)

2. **Извлечение sub-actions**
   - Читать `fix-vue-imports.md`
   - Извлечь 4 шага: detect → resolve → apply → cleanup

3. **Формирование fallback**
   - Если не найден: предложить auto-ai (LLM) или manual decomposition

### Response (Server → Client)

```json
{
  "outcome": "action_proposal",
  "proposedActions": [
    {
      "actionId": "fix-vue-imports",
      "subActions": [
        { "actionId": "vue-import-detect", ... },
        { "actionId": "vue-import-resolve", ... },
        ...
      ]
    }
  ],
  "fallbackActions": [
    { "mode": "auto-ai", ... },
    { "mode": "task-decomposition", ... }
  ]
}
```

### Decision Point (Client)

Клиент выбирает:
- **Принять** предложенный экшен → переход к 2
- **Выбрать fallback** (auto-ai или manual)
- **Отклонить** → завершение

## Flow Diagram

```
Client                        Server
  |                             |
  |--- task_request ----------->|
  |                             |
  |                     [search actions]
  |                     [find fix-vue-imports]
  |                     [extract sub-actions]
  |                             |
  |<-- action_proposal ---------|
  |                             |
  | [user selects action]       |
  |                             |
```
