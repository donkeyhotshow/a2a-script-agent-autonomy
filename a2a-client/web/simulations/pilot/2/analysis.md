# Simulation True 2 - Analysis

## Request (Client → Server)

Клиент подтверждает выбор экшена и добавляет execution:
```json
{
  "action": "approve_action",
  "selectedAction": { "actionId": "fix-vue-imports" },
  "context": {
    "task": "исправить импорты в vue компонентах",
    "execution": {
      "actionId": "fix-vue-imports",
      "currentStep": 0,
      "totalSteps": 4,
      "history": []
    }
  }
}
```

## Response (Server → Client)

Сервер обновляет execution и возвращает DSL для первого шага:
```json
{
  "outcome": "action_executing",
  "context": {
    "task": "исправить импорты в vue компонентах",
    "execution": {
      "actionId": "fix-vue-imports",
      "currentStep": 1,
      "totalSteps": 4,
      "currentActionId": "vue-import-detect",
      "history": []
    }
  },
  "executingAction": {
    "actionId": "vue-import-detect",
    "dsl": { ... }
  }
}
```

## Process

1. **Принять context** - сохранить task и execution
2. **Обновить execution** - currentStep = 1, currentActionId = "vue-import-detect"
3. **Вернуть DSL** - скрипт для первого шага
