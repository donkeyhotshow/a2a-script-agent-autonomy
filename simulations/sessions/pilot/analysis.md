# Simulation True - Complete Workflow

## Overview

Симуляция полного воркфлоу системы action-based с передачей context на каждом шаге.

## Workflow

```
1. Client → Server: task_request (task)
              ↓
2. Server → Client: action_proposal + context (сервер откладывает task)
              ↓
3. Client → Server: approve_action + context (task + execution)
              ↓
4. Server → Client: action_executing + context (сервер обновляет execution)
              ↓
5. Client → Server: step_result + context
              ↓
6. Server → Client: action_executing + context
              ↓
... повторяется для каждого шага
```

## Context Structure

```json
{
  "context": {
    "task": "исправить импорты в vue компонентах",
    "execution": {
      "actionId": "fix-vue-imports",
      "currentStep": 1,
      "totalSteps": 4,
      "currentActionId": "vue-import-detect",
      "history": [
        { "step": 1, "actionId": "vue-import-detect", "status": "completed", "result": {...} }
      ]
    }
  }
}
```

## Files

```
simulation-true/
├── 1/
│   ├── request.json    # task_request
│   ├── response.json   # action_proposal + context
│   └── analysis.md
├── 2/
│   ├── request.json    # approve_action + context
│   ├── response.json   # action_executing + context
│   └── analysis.md
├── 3/
│   ├── request.json    # step_result + context
│   ├── response.json   # action_executing + context
│   └── analysis.md
├── 4/
│   ├── request.json    # step_result + context
│   ├── response.json   # action_executing + context
│   └── analysis.md
├── 5/
│   ├── request.json    # step_result + context
│   ├── response.json   # action_complete + context
│   └── analysis.md
└── analysis.md         # Этот файл
```

## Key Points

1. **Клиент отправляет task** - сервер откладывает её в context
2. **Context передается на каждом шаге** - содержит task + execution
3. **Сервер обновляет execution** - currentStep, currentActionId, history
4. **Fallback** - если экшен не найден, предлагается auto-ai или task-decomposition
