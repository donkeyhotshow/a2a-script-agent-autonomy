# detect-monolith-issues

| Параметр | Значение |
|----------|----------|
| actionId | detect-monolith-issues |
| categoryId | architecture |
| executorSystemId | script |
| title | Детекция проблем монолита |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование монолитного приложения для выявления архитектурных проблем.

## Что обнаруживается

### Масштабируемость
- Tight coupling
- Shared database
- Single point of failure
- Deployment bottlenecks

### Разработка
- Large codebase
- Slow builds
- Long test times
- Merge conflicts
- Team coordination

### Производительность
- Resource contention
- Memory leaks
- Database locks
- Unoptimized queries

### Технический долг
- Устаревшие зависимости
- Недостаточное покрытие тестами
- Слабая документация

## Метрики

### Code metrics
- Lines of code per module
- Cyclomatic complexity
- Coupling metrics
- File sizes

### Architecture metrics
- Component dependencies
- Shared dependencies
- Circular dependencies
- Module boundaries

## Когда рекомендовать拆分

- Команда > 5 разработчиков
- Build time > 10 минут
- Deployment frequency < 1/week
- High coupling
- Scaling limitations
