# Simulation: analyze-architecture

## Опис

Тестуємо екшен "Аналіз архітектури проекту" - визначення паттернів проектування і компонентної структури.

## Workflow

```
1. Client → Server: task_request (task: "проаналізувати архітектуру проекту")
           ↓
2. Server → Client: action_proposal + context (пропонує analyze-architecture з 5 sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (detect-patterns)
           ↓
5. Client → Server: step_result (detect-patterns) + context
           ↓
6. Server → Client: action_executing + context (analyze-components)
           ↓
7. Client → Server: step_result (analyze-components) + context
           ↓
8. Server → Client: action_executing + context (generate-arch-docs)
           ↓
9. Client → Server: step_result (generate-arch-docs) + context
           ↓
10. Server → Client: action_complete
```

## Sub-actions

1. **detect-patterns** - виявлення архітектурних паттернів (MVC, MVVM, Clean Architecture, DDD)
2. **analyze-components** - аналіз компонентної структури
3. **generate-arch-docs** - генерація архітектурної документації

## Очікувані результати

- Сервер пропонує екшен analyze-architecture з 5 sub-actions
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з архітектурним звітом
