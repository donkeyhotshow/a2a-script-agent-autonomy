# detect-authorization-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-authorization-issues |
| categoryId | security |
| executorSystemId | script |
| title | Детекция проблем авторизации |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет проблемы с авторизацией (authorization) в приложении.

## Детекция

### Проблемы
- IDOR (Insecure Direct Object Reference)
- Missing authorization checks
- Privilege escalation
- Broken access control
- Missing role checks

## Результат

- Список endpoints без проверки прав
- IDOR уязвимости
- Missing middleware
- Рекомендации

## Примеры

```
php
// Плохо - нет проверки
Route::delete('/users/{id}', function ($id) {
    User::find($id)->delete();
});

// Хорошо - с проверкой
Route::delete('/users/{id}', function ($id) {
    if (!Auth::user()->can('delete users')) {
        abort(403);
    }
    User::find($id)->delete();
});
