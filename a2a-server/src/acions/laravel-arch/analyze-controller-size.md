# analyze-controller-size

| Параметр | Значение |
|----------|----------|
| actionId | analyze-controller-size |
| categoryId | laravel-arch |
| executorSystemId | script |
| title | Анализ размера контроллеров |
| canMigrateToScript | ✅ |

## Описание

Автоматический анализ Laravel контроллеров для выявления слишком больших или сложных методов.

## Метрики анализа

- Количество строк в контроллере
- Количество методов
- Цикломатическая сложность
- Количество зависимостей
- Длина методов
- Количество return statements

## thresholds

| Метрика | Предупреждение | Критично |
|---------|---------------|----------|
| Строк в контроллере | > 300 | > 500 |
| Методов | > 15 | > 25 |
| Строк в методе | > 30 | > 50 |
| Параметров метода | > 5 | > 8 |

## Инструменты

- PHPStan
- Psalm
- Laravel-pint
- Custom static analysis

## Рекомендации по рефакторингу

- Extract Method
- Service Layer
- Form Request validation
- Resource classes
- Event/Listener pattern
