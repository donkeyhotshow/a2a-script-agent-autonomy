# apply-refactoring

| Параметр | Значение |
|----------|----------|
| actionId | apply-refactoring |
| categoryId | laravel-arch |
| executorSystemId | agent |
| title | Применение рефакторинга |
| canMigrateToScript | ⏳ |

## Описание

Агент применяет рекомендованные изменения кода для улучшения архитектуры Laravel приложения.

## Типичные операции

### Контроллеры
- Вынос валидации в Form Request
- Использование Resources
- Вызов сервисов вместо бизнес-логики

### Модели
- Добавление scopes
- Оптимизация отношений
- Добавление casts

### Сервисы
- Создание новых сервисов
- Рефакторинг существующих
- Внедрение интерфейсов

## Пример: Вынос в Form Request

### До
```
php
public function store(Request $request)
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:users',
        // ...
    ]);
    
    User::create($validated);
}
```

### После
```
php
public function store(UserRequest $request)
{
    User::create($request->validated());
}

// app/Http/Requests/UserRequest.php
class UserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
        ];
    }
}
```

## Требования

- Наличие тестов
- Понимание контекста
- Сохранение функциональности
- Инкрементальные изменения

## Риски

- Нарушение функциональности
- Необходимость обновления тестов
- Влияние на зависимые компоненты
