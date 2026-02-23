# Simulation 1 - Analysis

## Server Processes

### 1. RequestProcessor
- Получает запрос с `new_task`
- Запускает PhaseMachine

### 2. PhaseMachine States
```
idle → discovery → recognition → analysis → action → validation → completed
```

### 3. Neuron Activation Flow

| Neuron | Priority | Trigger | Status |
|--------|----------|---------|--------|
| neuron-task-semantic-analyzer | 10 | * | completed |
| neuron-project-context-detector | 8 | frameworks | completed |
| neuron-file-collector | 5 | request_files | in_progress |

### 4. Task Migration (new_task → task)

```
new_task: "исправить импорты после рефакторинга"
         ↓
    Task with clarifications
         ↓
  clarifications: [
    { type: "file_request", question: "...", status: "pending" }
  ]
```

### 5. Neuron Actions

Нейроны возвращают `actions` - требования действий:

```
json
{
  "actions": [
    { "type": "request_files", "items": ["**/*.php"] }
  ]
}
```

### 6. Clarifications

Когда нейрон требует уточнения → создаётся `clarification`:
- Мигрирует в `task.clarifications`
- Клиент должен ответить
- Задача уточняется на основе ответов

## Outcome: need_files

Сервер запрашивает файлы через clarification.
