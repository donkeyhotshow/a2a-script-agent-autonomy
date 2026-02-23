# suggest-message-queue

| Параметр | Значение |
|----------|----------|
| actionId | suggest-message-queue |
| categoryId | queues |
| executorSystemId | agent |
| title | Предложение message queue |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует приложение и предлагает использование message queue для асинхронной обработки.

## Когда рекомендовать очереди

### Сценарии
- Длительные операции (>1 сек)
- Heavy computations
- Email/SMS отправка
- Обработка файлов
- Third-party API calls
- Batch processing
- Event-driven архитектура

### Преимущества
- Улучшение UX
- Масштабируемость
- Reliability
- Decoupling
- Rate limiting

## Типы очередей

### Redis-based
- Laravel Queue (Redis)
- Bull (Node.js)
- RQ (Python)

### Message Brokers
- RabbitMQ
- Apache Kafka
- Amazon SQS
- Google Pub/Sub
- NATS

## Примеры

```
php
// Laravel
SendEmail::dispatch($user);

// С задержкой
SendEmail::dispatch($user)->delay(now()->addMinutes(10));
```

```
javascript
// Bull Queue
queue.add('send-email', { userId: 1 });
```

## Best practices

- Retry logic
- Dead letter queues
- Idempotency
- Monitoring
- Graceful shutdown
