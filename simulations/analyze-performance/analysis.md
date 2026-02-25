# Simulation: analyze-performance

## Опис

Тестуємо екшен "Аналіз продуктивності" - аналіз продуктивності коду, виявлення вузьких місць.

## Workflow

```
1. Client → Server: task_request (task: "проаналізувати продуктивність проекту")
           ↓
2. Server → Client: action_proposal + context (пропонує analyze-performance з sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (scan-performance)
           ↓
5. Client → Server: step_result (scan-performance) + context
           ↓
6. Server → Client: action_executing + context (analyze-bottlenecks)
           ↓
7. Client → Server: step_result (analyze-bottlenecks) + context
           ↓
8. Server → Client: action_executing + context (generate-perf-report)
           ↓
9. Client → Server: step_result (generate-perf-report) + context
           ↓
10. Server → Client: action_complete
```

## Sub-actions

1. **scan-performance** - сканування продуктивності
2. **analyze-bottlenecks** - аналіз вузьких місць
3. **generate-perf-report** - генерація звіту

## Очікувані результати

- Сервер пропонує екшен analyze-performance з sub-actions
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з звітом про продуктивність
