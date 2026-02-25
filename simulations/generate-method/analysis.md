# Simulation: generate-method

## Опис

Тестуємо екшен "Генерація методу" - додавання нового методу до існуючого класу (моделі, контролера, сервісу).

## Workflow

```
1. Client → Server: task_request (task: "додати метод getActiveUsers до User")
           ↓
2. Server → Client: action_proposal + context
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (analyze-class)
           ↓
5. Client → Server: step_result (analyze-class) + context
           ↓
6. Server → Client: action_executing + context (generate-method)
           ↓
7. Client → Server: step_result (generate-method) + context
           ↓
8. Server → Client: action_complete
```

## Sub-actions

1. **analyze-class** - аналіз існуючого класу
2. **generate-method** - генерація нового методу

## Очікувані результати

- Сервер пропонує екшен generate-method
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з згенерованим методом
