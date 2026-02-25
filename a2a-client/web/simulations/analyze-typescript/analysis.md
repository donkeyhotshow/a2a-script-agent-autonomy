# Simulation: analyze-typescript

## Опис

Тестуємо екшен "Аналіз TypeScript коду" - перевірка типів, інтерфейсів та загальних помилок.

## Workflow

```
1. Client → Server: task_request (task: "перевірити TypeScript типи")
           ↓
2. Server → Client: action_proposal + context (пропонує analyze-typescript з 6 sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (scan-ts-files)
           ↓
5. Client → Server: step_result (scan-ts-files) + context
           ↓
6. Server → Client: action_executing + context (check-types)
           ↓
7. Client → Server: step_result (check-types) + context
           ↓
8. Server → Client: action_executing + context (generate-ts-report)
           ↓
9. Client → Server: step_result (generate-ts-report) + context
           ↓
10. Server → Client: action_complete
```

## Sub-actions

1. **scan-ts-files** - сканування TypeScript файлів
2. **check-types** - перевірка типів, інтерфейсів
3. **detect-any-types** - виявлення типів 'any'
4. **generate-ts-report** - генерація звіту

## Очікувані результати

- Сервер пропонує екшен analyze-typescript з 6 sub-actions
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з TypeScript звітом
