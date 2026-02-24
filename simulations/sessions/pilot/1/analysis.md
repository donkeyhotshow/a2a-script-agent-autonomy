# Simulation True 1 - Analysis

## Request (Client → Server)

Клиент отправляет задачу:
```json
{
  "action": "task_request",
  "task": "исправить импорты в vue компонентах"
}
```

## Response (Server → Client)

Сервер ищет экшен в базе и откладывает task в context:
```json
{
  "outcome": "action_proposal",
  "context": {
    "task": "исправить импорты в vue компонентах"
  },
  "proposedActions": [
    {
      "actionId": "fix-vue-imports",
      "subActions": [...]
    }
  ],
  "fallbackActions": [...]
}
```

## Process

1. **Поиск экшена** - искать в `a2a-server/src/actions/`
2. **Найден**: `fix-vue-imports` (matchScore: 0.95)
3. **Отложить task в context** - сервер сохраняет задачу

## Fallback

Если экшен НЕ найден:
- `auto-ai`: LLM генерация (rnj-1 через Ollama)
- `task-decomposition`: Ручная декомпозиция
