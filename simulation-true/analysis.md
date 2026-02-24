# Simulation True - Complete Workflow

## Overview

Симуляция полного воркфлоу системы action-based с передачей контекста.

## Ключевые изменения

### Контекст на каждом шаге

**Клиент** принудительно отправляет `context` на каждом запросе:
```json
{
  "context": {
    "project": { ... },
    "execution": {
      "actionId": "fix-vue-imports",
      "currentStep": 1,
      "totalSteps": 4,
      "currentActionId": "vue-import-detect",
      "history": [
        { "step": 1, "actionId": "vue-import-detect", "status": "completed", "result": { ... } }
      ]
    }
  }
}
```

**Сервер** откладывает важные значения в контекст:
- `currentStep` - текущий шаг
- `currentActionId` - ID текущего экшена
- `history` - история выполненных шагов с результатами

## Workflow

```
Client → Server: task_request
Server → Client: action_proposal

Client → Server: approve_action + context (currentStep: 0)
Server → Client: action_executing + context (currentStep: 1)

Client → Server: step_result + context (currentStep: 1, history: [step1])
Server → Client: action_executing + context (currentStep: 2)

Client → Server: step_result + context (currentStep: 2, history: [step1, step2])
Server → Client: action_executing + context (currentStep: 3)

Client → Server: step_result + context (currentStep: 3, history: [step1, step2, step3])
Server → Client: action_complete + context (currentStep: 4, status: completed)
```

## Files

```
simulation-true/
├── 1/
│   ├── request.json    # task_request
│   ├── response.json   # action_proposal
│   └── analysis.md
├── 2/
│   ├── request.json    # approve_action + context
│   ├── response.json   # action_executing + updated context
│   └── analysis.md
├── 3/
│   ├── request.json    # step_result + context (history: [step1])
│   ├── response.json   # action_executing + updated context
│   └── analysis.md
├── 4/
│   ├── request.json    # step_result + context (history: [step1, step2])
│   ├── response.json   # action_executing + updated context
│   └── analysis.md
├── 5/
│   ├── request.json    # step_result + context (history: [step1, step2, step3])
│   ├── response.json   # action_complete + final context
│   └── analysis.md
└── analysis.md         # Этот файл
```
