# Code-Related Actions Index

Справочник действий, релевантных для работы над кодом. Организованы по категориям.

## Категории

### 1. Code Quality (Качество кода)
- [detect-code-smells](./code-quality/detect-code-smells.md) - Детекция code smells
- [suggest-refactoring](./code-quality/suggest-refactoring.md) - Предложение рефакторинга
- [apply-refactoring](./code-quality/apply-refactoring.md) - Применение рефакторинга

### 2. Documentation (Документация)
- [generate-readme](./documentation/generate-readme.md) - Генерация README
- [generate-api-docs](./documentation/generate-api-docs.md) - Генерация API docs

### 3. Security (Безопасность)
- [scan-vulnerabilities](./security/scan-vulnerabilities.md) - Сканирование уязвимостей
- [check-dependencies](./security/check-dependencies.md) - Проверка зависимостей
- [detect-secrets](./security/detect-secrets.md) - Детекция секретов

### 4. Testing (Тестирование)
- [generate-tests](./testing/generate-tests.md) - Генерация тестов
- [run-regression-tests](./testing/run-regression-tests.md) - Регрессионное тестирование
- [validate-data](./testing/validate-data.md) - Валидация данных

### 5. DevOps
- [auto-deploy](./devops/auto-deploy.md) - Автоматический деплой
- [rollback-deployment](./devops/rollback-deployment.md) - Откат деплоя

### 6. Migration (Миграции)
- [migrate-db-schema](./migration/migrate-db-schema.md) - Миграция схемы БД
- [migrate-data](./migration/migrate-data.md) - Миграция данных

### 7. Performance (Производительность)
- [optimize-queries](./performance/optimize-queries.md) - Оптимизация запросов
- [add-indexes](./performance/add-indexes.md) - Добавление индексов

### 8. Data Transform (Трансформация данных)
- [etl-process](./data-transform/etl-process.md) - ETL процессы
- [aggregate-data](./data-transform/aggregate-data.md) - Агрегация данных

### 9. Code Generation (Генерация кода)
- [generate-crud](./code-gen/generate-crud.md) - Генерация CRUD
- [generate-migration](./code-gen/generate-migration.md) - Генерация миграции
- [generate-api-client](./code-gen/generate-api-client.md) - Генерация API клиента

### 10. Architecture (Архитектура)
- [detect-microservices](./architecture/detect-microservices.md) - Детекция микросервисов
- [suggest-service-mesh](./architecture/suggest-service-mesh.md) - Предложение service mesh
- [detect-monolith-issues](./architecture/detect-monolith-issues.md) - Детекция проблем монолита
- [suggest-domain-driven-design](./architecture/suggest-domain-driven-design.md) - Предложение DDD

### 11. Middleware
- [detect-middleware](./middleware/detect-middleware.md) - Детекция middleware
- [suggest-rate-limiting](./middleware/suggest-rate-limiting.md) - Предложение rate limiting
- [implement-rate-limiter](./middleware/implement-rate-limiter.md) - Реализация rate limiter

### 12. Authentication (Аутентификация)
- [detect-auth-strategy](./auth/detect-auth-strategy.md) - Детекция стратегии аутентификации
- [suggest-jwt](./auth/suggest-jwt.md) - Предложение JWT
- [suggest-oauth](./auth/suggest-oauth.md) - Предложение OAuth
- [implement-2fa](./auth/implement-2fa.md) - Реализация 2FA

### 13. Validation (Валидация)
- [detect-validation](./validation/detect-validation.md) - Детекция валидации
- [suggest-validation-library](./validation/suggest-validation-library.md) - Предложение библиотеки валидации

### 14. Database (Базы данных)
- [detect-n-plus-one](./database/detect-n-plus-one.md) - Детекция N+1 проблемы
- [suggest-eager-loading](./database/suggest-eager-loading.md) - Предложение eager loading
- [add-database-indexes](./database/add-database-indexes.md) - Добавление индексов
- [suggest-query-optimization](./database/suggest-query-optimization.md) - Предложение оптимизации запросов
- [detect-missing-indexes](./database/detect-missing-indexes.md) - Детекция missing indexes
- [detect-slow-queries](./database/detect-slow-queries.md) - Детекция медленных запросов

### 15. Caching (Кэширование)
- [suggest-caching-strategy](./caching/suggest-caching-strategy.md) - Предложение стратегии кэширования
- [implement-redis-cache](./caching/implement-redis-cache.md) - Реализация Redis кэша
- [detect-cache-invalidation](./caching/detect-cache-invalidation.md) - Детекция инвалидации кэша
- [suggest-cdn-integration](./caching/suggest-cdn-integration.md) - Предложение CDN

### 16. Queues (Очереди)
- [detect-queue-usage](./queues/detect-queue-usage.md) - Детекция использования очередей
- [suggest-message-queue](./queues/suggest-message-queue.md) - Предложение message queue
- [implement-rabbitmq](./queues/implement-rabbitmq.md) - Реализация RabbitMQ
- [implement-kafka](./queues/implement-kafka.md) - Реализация Kafka

### 17. API Design (Проектирование API)
- [detect-api-style](./api-design/detect-api-style.md) - Детекция стиля API
- [suggest-rest-conventions](./api-design/suggest-rest-conventions.md) - Предложение REST конвенций
- [suggest-graphql](./api-design/suggest-graphql.md) - Предложение GraphQL
- [generate-openapi-spec](./api-design/generate-openapi-spec.md) - Генерация OpenAPI спецификации

---

## Статистика

- **Всего категорий**: 17
- **Всего действий**: 50+

## Статусы миграции

| Статус | Описание |
|--------|----------|
| ✅ | Готово к миграции на script |
| ⏳ | В разработке |
| ❌ | Недоступно для миграции |

## Использование

1. Выберите категорию из списка
2. Откройте соответствующий файл для детальной информации
