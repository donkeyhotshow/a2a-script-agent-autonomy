# suggest-domain-driven-design

| Параметр | Значение |
|----------|----------|
| actionId | suggest-domain-driven-design |
| categoryId | architecture |
| executorSystemId | agent |
| title | Предложение DDD |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует монолитное приложение и предлагает применение Domain-Driven Design для улучшения архитектуры.

## Основные концепции DDD

### Bounded Contexts
- Явные границы между доменами
- Общий язык (Ubiquitous Language)
- Explicit interfaces

### Domain Model
- Entities
- Value Objects
- Aggregates
- Domain Events

### Patterns
- Repository
- Factory
- Service
- Domain Event

## Пример структуры

```
src/
├── Domain/
│   ├── Entities/
│   │   └── Order.php
│   ├── ValueObjects/
│   │   └── Money.php
│   ├── Aggregates/
│   │   └── OrderAggregate.php
│   └── Events/
│       └── OrderPlaced.php
├── Application/
│   ├── Services/
│   │   └── OrderService.php
│   └── Commands/
│       └── PlaceOrderCommand.php
├── Infrastructure/
│   ├── Repositories/
│   │   └── EloquentOrderRepository.php
│   └── EventBus/
└── Presentation/
    └── Controllers/
```

## Когда рекомендовать

- Сложная бизнес-логика
- Multiple subdomains
- Large team
- Need for bounded contexts
- Complex relationships

## Benefits

- Clear boundaries
- Business-centric
- Maintainable
- Testable
- Evolvable
