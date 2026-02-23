# detect-input-validation

| Параметр | Значение |
|----------|----------|
| actionId | detect-input-validation |
| categoryId | security |
| executorSystemId | script |
| title | Детекция валидации ввода |
| scope | all |
| canMigrateToScript | ✅ |

## Описание

Скрипт автоматически определяет отсутствие валидации ввода в приложении.

## Детекция

### Проблемы
- Missing validation
- No type checking
- No sanitization
- SQL injection risks
- XSS risks

### Файлы для сканирования
- Controllers
- Request classes
- Models

## Результат

- Список endpoints без валидации
- Рекомендуемые правила
- Severity

## Примеры

```
php
// Плохо
public function store(Request $request) {
    User::create($request->all());
}

// Хорошо
public function store(Request $request) {
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:users',
    ]);
    User::create($validated);
}
