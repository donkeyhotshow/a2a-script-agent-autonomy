# Simulation True 2 - Analysis

## Workflow: Client Approves Action with Context

### Request (Client → Server)

Клиент подтверждает выбор экшена и отправляет контекст:
```json
{
  "action": "approve_action",
  "selectedAction": { "actionId": "fix-vue-imports" },
  "context": {
    "project": { ... },
    "execution": {
      "actionId": "fix-vue-imports",
      "currentStep": 0,
      "totalSteps": 4,
      "history": []
    }
  }
}
```

### Process (Server Side)

1. **Сохранение контекста**
   - Принять context от клиента
   - Обновить currentStep = 1
   - Записать currentActionId = "vue-import-detect"

2. **Генерация DSL для первого шага**
   - Sub-action: `vue-import-detect`
   - Сгенерировать исполняемый DSL скрипт

### Response (Server → Client)

```json
{
  "outcome": "action_executing",
  "context": {
    "execution": {
      "actionId": "fix-vue-imports",
      "currentStep": 1,
      "currentActionId": "vue-import-detect",
      "history": []
    }
  },
  "executingAction": { ... }
}
```

### Key Point

Клиент **принудительно отправляет** context на каждом шаге.
Сервер **откладывает** важные значения (currentStep, currentActionId, history) в context.
