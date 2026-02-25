# Simulation: phpunit-deprecations

## Опис

Тестуємо екшен "Пошук застарілих PHPUnit методів" - виявлення deprecated методів у PHPUnit тестах.

## Workflow

```
1. Client → Server: task_request (task: "знайти застарілі PHPUnit методи")
           ↓
2. Server → Client: action_proposal + context (пропонує phpunit-deprecations з sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (scan-phpunit)
           ↓
5. Client → Server: step_result (scan-phpunit) + context
           ↓
6. Server → Client: action_executing + context (detect-deprecations)
           ↓
7. Client → Server: step_result (detect-deprecations) + context
           ↓
8. Server → Client: action_executing + context (generate-deprecations-report)
           ↓
9. Client → Server: step_result (generate-deprecations-report) + context
           ↓
10. Server → Client: action_complete
```

## Sub-actions

1. **scan-phpunit** - сканування PHPUnit тестів
2. **detect-deprecations** - виявлення deprecated методів
3. **generate-deprecations-report** - генерація звіту

## Очікувані результати

- Сервер пропонує екшен phpunit-deprecations з sub-actions
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з звітом
