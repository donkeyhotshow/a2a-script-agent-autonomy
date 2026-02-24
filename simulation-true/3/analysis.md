# Simulation True 3 - Analysis

## Workflow: Step Result → Next Step

### Request (Client → Server)

Клиент отправляет результат первого шага:
```json
{
  "action": "step_result",
  "stepId": "vue-import-detect",
  "result": { "broken_imports": [...] }
}
```

### Process (Server Side)

1. **Обработка результата**
   - Принять результат выполнения шага
   - Сохранить для контекста

2. **Переход к следующему шагу**
   - Sub-action: `vue-import-resolve`
   - Передать broken_imports как входные данные
   - Сгенерировать DSL скрипт

### Response (Server → Client)

```json
{
  "outcome": "action_executing",
  "currentStep": 2,
  "previousStep": { "actionId": "vue-import-detect", "result": { "broken_imports": 3 } },
  "executingAction": {
    "actionId": "vue-import-resolve",
    "dsl": { "script": "vue-import-resolve", "input": { "broken_imports": [...] } }
  }
}
```

## Chain

```
Step 1: vue-import-detect
         ↓
       result: 3 broken imports
         ↓
Step 2: vue-import-resolve (текущий)
         ↓
       result: patches[]
         ↓
Step 3: vue-import-apply
         ↓
       result: fixed files
         ↓
Step 4: vue-import-cleanup
         ↓
       result: action_complete
```

## Flow Diagram

```
Client                        Server
  |                             |
  |--- step_result ------------>|
  |   { broken_imports: [...] }  |
  |                             |
  |                     [process result]
  |                     [get next sub-action]
  |                     [generate DSL for step 2]
  |                             |
  |<-- action_executing --------|
  |   { vue-import-resolve }    |
  |                             |
```
