# Simulation: generate-view

## Опис

Тестуємо екшен "Генерація представлення" - створення Vue/Blade/React компонента для відображення даних.

## Workflow

```
1. Client → Server: task_request (task: "створити форму редагування користувача")
           ↓
2. Server → Client: action_proposal + context
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (analyze-model)
           ↓
5. Client → Server: step_result (analyze-model) + context
           ↓
6. Server → Client: action_executing + context (generate-view)
           ↓
7. Client → Server: step_result (generate-view) + context
           ↓
8. Server → Client: action_complete
```

## Sub-actions

1. **analyze-model** - аналіз моделі для визначення полів та їх типів
2. **generate-view** - генерація представлення (Vue/Blade/React)

## Очікувані результати

- Сервер пропонує екшен generate-view
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з згенерованим представленням
