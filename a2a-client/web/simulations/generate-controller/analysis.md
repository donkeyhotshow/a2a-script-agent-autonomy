# Simulation: generate-controller

## Опис

Тестуємо екшен "Генерація контролера" - створення контролера з CRUD методами для Laravel/Node.js.

## Workflow

```
1. Client → Server: task_request (task: "створити контролер для User")
           ↓
2. Server → Client: action_proposal + context (пропонує generate-controller)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (analyze-model)
           ↓
5. Client → Server: step_result (analyze-model) + context
           ↓
6. Server → Client: action_executing + context (generate-controller)
           ↓
7. Client → Server: step_result (generate-controller) + context
           ↓
8. Server → Client: action_complete
```

## Sub-actions

1. **analyze-model** - аналіз існуючої моделі для визначення полів
2. **generate-controller** - генерація контролера з CRUD методами

## Очікувані результати

- Сервер пропонує екшен generate-controller
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з згенерованим контролером
