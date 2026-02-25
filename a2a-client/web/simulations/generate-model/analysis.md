# Simulation: generate-model

## Опис

Тестуємо екшен "Генерація моделі" - створення Eloquent моделі для Laravel з полями, зв'язками таfillable/visible/hidden атрибутами.

## Workflow

```
1. Client → Server: task_request (task: "створити модель User")
           ↓
2. Server → Client: action_proposal + context
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (analyze-fields)
           ↓
5. Client → Server: step_result (analyze-fields) + context
           ↓
6. Server → Client: action_executing + context (generate-model)
           ↓
7. Client → Server: step_result (generate-model) + context
           ↓
8. Server → Client: action_complete
```

## Sub-actions

1. **analyze-fields** - аналіз полів для моделі з контексту або БД
2. **generate-model** - генерація файлу моделі

## Очікувані результати

- Сервер пропонує екшен generate-model
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з згенерованою моделлю
