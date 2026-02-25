# Simulation: generate-test

## Опис

Тестуємо екшен "Генерація тесту" - створення unit або feature тесту для Laravel/PHP.

## Workflow

```
1. Client → Server: task_request (task: "створити тест для UserController")
           ↓
2. Server → Client: action_proposal + context
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (analyze-target)
           ↓
5. Client → Server: step_result (analyze-target) + context
           ↓
6. Server → Client: action_executing + context (generate-test)
           ↓
7. Client → Server: step_result (generate-test) + context
           ↓
8. Server → Client: action_complete
```

## Sub-actions

1. **analyze-target** - аналіз цільового класу/методу
2. **generate-test** - генерація тестового файлу

## Очікувані результати

- Сервер пропонує екшен generate-test
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з згенерованим тестом
