# Simulation True 3 - Analysis

## Request (Client → Server)

Клиент отправляет результат первого шага:
```json
{
  "action": "step_result",
  "stepId": "vue-import-detect",
  "result": { "broken_imports": [...] },
  "context": {
    "task": "исправить импорты в vue компонентах",
    "execution": {
      "actionId": "fix-vue-imports",
      "currentStep": 1,
      "currentActionId": "vue-import-detect",
      "history": [{ "step": 1, "status": "completed", "result": {...} }]
    }
  }
}
```

## Response (Server → Client)

Сервер обновляет context и возвращает DSL для следующего шага:
```json
{
  "outcome": "action_executing",
  "context": {
    "task": "исправить импорты в vue компонентах",
    "execution": {
      "actionId": "fix-vue-imports",
      "currentStep": 2,
      "currentActionId": "vue-import-resolve",
      "history": [{ "step": 1, "status": "completed", "result": {...} }]
    }
  },
  "executingAction": {
    "actionId": "vue-import-resolve",
    "dsl": { ... }
  }
}
```

## Process

1. **Принять result** - сохранить результат шага
2. **Обновить history** - добавить завершенный шаг
3. **Переход к следующему шагу** - currentStep++, currentActionId = "vue-import-resolve"
4. **Вернуть DSL** - скрипт для следующего шага
