# Simulation: hybrid-fix

## Опис

Тестуємо екшен "Гібридне виправлення" - виправляє проблеми в коді з використанням AI.

## Workflow

```
1. Client → Server: task_request (task: "виправити помилки в коді з AI")
           ↓
2. Server → Client: action_proposal + context (пропонує hybrid-fix з 3 sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (detect-issues)
           ↓
5. Client → Server: step_result (detect-issues) + context
           ↓
6. Server → Client: action_executing + context (apply-fix)
           ↓
7. Client → Server: step_result (apply-fix) + context
           ↓
8. Server → Client: action_executing + context (verify-fix)
           ↓
9. Client → Server: step_result (verify-fix) + context
           ↓
10. Server → Client: action_complete
```

## Sub-actions

1. **detect-issues** - виявляє проблеми в коді за допомогою AI аналізу
2. **apply-fix** - застосовує виправлення до коду
3. **verify-fix** - верифікує що виправлення працює

## Очікувані результати

- Сервер пропонує екшен hybrid-fix з 3 sub-actions
- Кожен крок повертає action_executing з оновленим context
- Фінальний крок повертає action_complete
