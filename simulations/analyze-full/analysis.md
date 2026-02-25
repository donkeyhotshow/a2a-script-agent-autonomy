# Simulation: analyze-full

## Опис

Тестуємо екшен "Повний аналіз проекту" - сканує файли, аналізує код, збирає метрики.

## Workflow

```
1. Client → Server: task_request (task: "проаналізувати проект")
           ↓
2. Server → Client: action_proposal + context (пропонує analyze-full з 3 sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (scan-files)
           ↓
5. Client → Server: step_result (scan-files) + context
           ↓
6. Server → Client: action_executing + context (analyze-code)
           ↓
7. Client → Server: step_result (analyze-code) + context
           ↓
8. Server → Client: action_executing + context (generate-report)
           ↓
9. Client → Server: step_result (generate-report) + context
           ↓
10. Server → Client: action_complete
```

## Sub-actions

1. **scan-files** - сканує структуру проекту, збирає список файлів
2. **analyze-code** - аналізує код, збирає метрики (сложність, покриття, размеры)
3. **generate-report** - генерує звіт з аналізом

## Очікувані результати

- Сервер пропонує екшен analyze-full з 3 sub-actions
- Кожен крок повертає action_executing з оновленим context
- Фінальний крок повертає action_complete з повним звітом
