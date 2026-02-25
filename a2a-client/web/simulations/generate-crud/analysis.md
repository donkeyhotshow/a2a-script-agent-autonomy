# Simulation: generate-crud

## Опис

Тестуємо екшен "Генерація повного CRUD" - створення моделі, контролера, міграції та views для сутності.

## Workflow

```
1. Client → Server: task_request (task: "створити CRUD для User")
           ↓
2. Server → Client: action_proposal + context (пропонує generate-crud з sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (prepare-model)
           ↓
5. Client → Server: step_result (prepare-model) + context
           ↓
6. Server → Client: action_executing + context (generate-code)
           ↓
7. Client → Server: step_result (generate-code) + context
           ↓
8. Server → Client: action_complete
```

## Sub-actions

1. **prepare-model** - підготовка даних моделі (поля, типи, валідація)
2. **generate-code** - генерація коду (model, controller, migration, views)

## Очікувані результати

- Сервер пропонує екшен generate-crud з sub-actions
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з згенерованим кодом
