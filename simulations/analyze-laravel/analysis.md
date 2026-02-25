# Simulation: analyze-laravel

## Опис

Тестуємо екшен "Аналіз Laravel коду" - перевірка моделей, контролерів, міграцій, роутів та сервіс-провайдерів.

## Workflow

```
1. Client → Server: task_request (task: "проаналізувати Laravel код")
           ↓
2. Server → Client: action_proposal + context (пропонує analyze-laravel з 8 sub-actions)
           ↓
3. Client → Server: approve_action + context
           ↓
4. Server → Client: action_executing + context (scan-php-files)
           ↓
5. Client → Server: step_result (scan-php-files) + context
           ↓
6. Server → Client: action_executing + context (analyze-models)
           ↓
7. Client → Server: step_result (analyze-models) + context
           ↓
8. Server → Client: action_executing + context (generate-laravel-report)
           ↓
9. Client → Server: step_result (generate-laravel-report) + context
           ↓
10. Server → Client: action_complete
```

## Sub-actions

1. **scan-php-files** - сканування PHP файлів проекту
2. **analyze-models** - аналіз Eloquent моделей, зв'язків і міграцій
3. **analyze-controllers** - аналіз контролерів і бізнес-логіки
4. **generate-laravel-report** - генерація звіту по Laravel

## Очікувані результати

- Сервер пропонує екшен analyze-laravel з 8 sub-actions
- Кожен крок повертає action_executing з відповідним sub-action
- Фінальний крок повертає action_complete з Laravel звітом
