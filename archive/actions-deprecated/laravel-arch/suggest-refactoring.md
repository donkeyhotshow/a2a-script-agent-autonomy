# suggest-refactoring

| Параметр | Значение |
|----------|----------|
| actionId | suggest-refactoring |
| categoryId | laravel-arch |
| executorSystemId | agent |
| title | Предложение рефакторинга |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует Laravel архитектуру и предлагает улучшения для повышения качества кода.

## Типичные предложения

### Controller Layer
- Вынос валидации в Form Requests
- Использование Resource classes
- Вынос бизнес-логики в Services
- Применение Action паттерна

### Model Layer
- Accessors/Mutators
- Scope методы
- Relations оптимизация
- Attribute casting

### Service Layer
- Single Responsibility
- Dependency Injection
- Интерфейсы для сервисов

### Repository Layer
- Добавление Repository
- Кэширование запросов

## Анализируемые паттерны

- SOLID принципы
- Laravel Best Practices
- PSR стандарты
- Тестируемость
- Производительность

## Примеры рекомендаций

1. "Вынесите валидацию в App\Http\Requests\UserRequest"
2. "Используйте App\Http\Resources\UserResource для трансформации"
3. "Создайте OrderService для бизнес-логики заказов"
4. "Добавьте scope для часто используемых запросов"
