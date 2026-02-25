# Simulation: analyze-security

## Опис

Тестуємо екшен "Аналіз безпеки" - виявлення вразливостей та проблем безпеки.

## Workflow

```
1. Client → Server: task_request (task: "проаналізувати безпеку проекту")
           ↓
2. Server → Client: action_proposal + context (пропонує analyze-security з sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (scan-security)
           ↓
5. Client → Server: step_result (scan-security) + context
           ↓
6. Server → Client: action_executing + context (detect-vulnerabilities)
           ↓
7. Client → Server: step_result (detect-vulnerabilities) + context
           ↓
8. Server → Client: action_executing + context (generate-sec-report)
           ↓
9. Client → Server: step_result (generate-sec-report) + context
           ↓
10. Server → Client: action_complete
```

## Sub-actions

1. **scan-security** - сканування безпеки
2. **detect-vulnerabilities** - виявлення вразливостей
3. **generate-sec-report** - генерація звіту

## Очікувані результати

- Сервер пропонує екшен analyze-security з sub-actions
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з звітом безпеки
