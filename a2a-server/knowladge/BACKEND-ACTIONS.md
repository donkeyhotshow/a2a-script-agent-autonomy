# Backend Actions Table

| actionId | categoryId | executorSystemId | title | framework | canMigrateToScript |
|----------|-----------|------------------|-------|-----------|-------------------|
| detect-api-style | api-design | script | Детекция стиля API | all | ✅ |
| suggest-rest-conventions | api-design | agent | Предложение REST conventions | all | ✅ |
| suggest-graphql | api-design | agent | Предложение GraphQL | all | ✅ |
| generate-openapi-spec | api-design | script | Генерация OpenAPI spec | all | ✅ |
| detect-n-plus-one | database | script | Детекция N+1 queries | all | ✅ |
| suggest-eager-loading | database | agent | Предложение eager loading | all | ✅ |
| add-database-indexes | database | agent | Добавление индексов | all | ⏳ |
| detect-missing-indexes | database | script | Детекция отсутствующих индексов | all | ✅ |
| suggest-query-optimization | database | agent | Предложение оптимизации запросов | all | ✅ |
| detect-slow-queries | database | script | Детекция медленных запросов | all | ✅ |
| suggest-caching-strategy | caching | agent | Предложение стратегии кэширования | all | ✅ |
| implement-redis-cache | caching | agent | Реализация Redis кэша | all | ⏳ |
| detect-cache-invalidation | caching | script | Детекция инвалидации кэша | all | ✅ |
| suggest-cdn-integration | caching | agent | Предложение CDN | all | ✅ |
| detect-queue-usage | queues | script | Детекция использования очередей | all | ✅ |
| suggest-message-queue | queues | agent | Предложение message queue | all | ✅ |
| implement-rabbitmq | queues | agent | Реализация RabbitMQ | all | ⏳ |
| implement-kafka | queues | agent | Реализация Kafka | all | ⏳ |
| detect-microservices | architecture | script | Детекция микросервисов | all | ✅ |
| suggest-service-mesh | architecture | agent | Предложение service mesh | all | ✅ |
| detect-monolith-issues | architecture | script | Детекция проблем монолита | all | ✅ |
| suggest-domain-driven-design | architecture | agent | Предложение DDD | all | ✅ |
| detect-middleware | middleware | script | Детекция middleware | all | ✅ |
| suggest-rate-limiting | middleware | agent | Предложение rate limiting | all | ✅ |
| implement-rate-limiter | middleware | agent | Реализация rate limiter | all | ⏳ |
| detect-auth-strategy | auth | script | Детекция стратегии аутентификации | all | ✅ |
| suggest-jwt | auth | agent | Предложение JWT | all | ✅ |
| suggest-oauth | auth | agent | Предложение OAuth | all | ✅ |
| implement-2fa | auth | agent | Реализация 2FA | all | ⏳ |
| detect-validation | validation | script | Детекция валидации | all | ✅ |
| suggest-validation-library | validation | agent | Предложение библиотеки валидации | all | ✅ |
| detect-error-handling | error-handling | script | Детекция обработки ошибок | all | ✅ |
| suggest-error-tracking | error-handling | agent | Предложение error tracking | all | ✅ |
| implement-sentry | error-handling | agent | Реализация Sentry | all | ⏳ |
| detect-logging-strategy | logging | script | Детекция стратегии логирования | all | ✅ |
| suggest-structured-logging | logging | agent | Предложение structured logging | all | ✅ |
| implement-elk-stack | logging | agent | Реализация ELK stack | all | ⏳ |
| detect-websockets | realtime | script | Детекция WebSockets | all | ✅ |
| suggest-socket-io | realtime | agent | Предложение Socket.io | all | ✅ |
| implement-websockets | realtime | agent | Реализация WebSockets | all | ⏳ |
| detect-file-uploads | files | script | Детекция загрузки файлов | all | ✅ |
| suggest-file-storage | files | agent | Предложение хранилища файлов | all | ✅ |
| implement-s3-integration | files | agent | Реализация S3 интеграции | all | ⏳ |

## Активация по контексту

```json
{
  "express": {
    "detectors": ["package.json:express", "app.js", "server.js"],
    "actions": ["suggest-rate-limiting", "detect-middleware"]
  },
  "fastify": {
    "detectors": ["package.json:fastify"],
    "actions": ["suggest-validation-library", "detect-middleware"]
  },
  "nestjs": {
    "detectors": ["package.json:@nestjs/core", "*.module.ts"],
    "actions": ["suggest-domain-driven-design", "detect-services"]
  },
  "laravel": {
    "detectors": ["composer.json:laravel/framework", "app/Http/Controllers"],
    "actions": ["detect-n-plus-one", "suggest-eager-loading"]
  },
  "redis": {
    "detectors": ["package.json:redis", "config/cache.php"],
    "actions": ["implement-redis-cache", "suggest-caching-strategy"]
  }
}
```

## Статистика
- Всего: 43 действий
- script: 22 (51%)
- agent: 14 (33%)
- agent: 7 (16%)
