# Simulation True 4 - Analysis

## Workflow: Apply Patches

### Request (Client → Server)

Клиент отправляет результат второго шага:
```json
{
  "action": "step_result",
  "stepId": "vue-import-resolve",
  "result": { "patches": [...] }
}
```

### Process (Server Side)

1. **Обработка результата**
   - Принять массив patches

2. **Переход к следующему шагу**
   - Sub-action: `vue-import-apply`
   - Передать patches как входные данные
   - Сгенерировать DSL скрипт

### Response (Server → Client)

```json
{
  "outcome": "action_executing",
  "currentStep": 3,
  "executingAction": {
    "actionId": "vue-import-apply",
    "dsl": { "script": "vue-import-apply", "input": { "patches": [...] } }
  }
}
```

## Chain

```
Step 1: vue-import-detect
Step 2: vue-import-resolve
Step 3: vue-import-apply (текущий)
Step 4: vue-import-cleanup → завершение
```
