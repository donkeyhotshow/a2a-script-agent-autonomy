# Simulation: generate-migration

## Опис

Тестуємо екшен "Генерація міграції" - створення файлу міграції для Laravel.

## Workflow

```
1. Client → Server: task_request (task: "створити міграцію для таблиці users")
           ↓
2. Server → Client: action_proposal + context
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (analyze-table)
           ↓
5. Client → Server: step_result (analyze-table) + context
           ↓
6. Server → Client: action_executing + context (generate-migration)
           ↓
7. Client → Server: step_result (generate-migration) + context
           ↓
8. Server → Client: action_complete
```

## Sub-actions

1. **analyze-table** - аналіз структури таблиці
2. **generate-migration** - генерація файлу міграції

## Очікувані результати

- Сервер пропонує екшен generate-migration
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з згенерованою міграцією
