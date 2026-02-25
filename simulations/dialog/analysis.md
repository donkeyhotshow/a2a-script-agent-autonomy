# Simulation: dialog

## Опис

Тестуємо екшен "Діалог з користувачем" - задає питання і отримує відповіді.

## Workflow

```
1. Client → Server: task_request (task: "запитати у користувача про версію Node.js")
           ↓
2. Server → Client: action_proposal + context (пропонує dialog з user-question sub-action)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (user-question)
           ↓
5. Client → Server: step_result (user-response) + context
           ↓
6. Server → Client: action_complete
```

## Sub-actions

1. **user-question** - задає питання користувачу і чекає на відповідь

## Очікувані результати

- Сервер пропонує екшен dialog з user-question sub-action
- Крок повертає action_executing з питанням
- Фінальний крок повертає action_complete з відповіддю користувача
