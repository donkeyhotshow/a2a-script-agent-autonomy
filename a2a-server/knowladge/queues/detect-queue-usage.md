# detect-queue-usage

| Параметр | Значение |
|----------|----------|
| actionId | detect-queue-usage |
| categoryId | queues |
| executorSystemId | script |
| title | Детекция использования очередей |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Автоматическое сканирование кода для определения использования очередей сообщений.

## Что обнаруживается

### Типы задач для очередей
- Email отправка
- Обработка файлов
- API интеграции
- Heavy computations
- Notifications
- Logs processing

### Паттерны
- Sync vs async обработка
- Long-running tasks
- Batch processing
- Event-driven architecture

## Примеры

```
php
// Синхронно - блокирует
Mail::send($email);

// В очереди - асинхронно
Mail::dispatch($email);
```

```
python
# Синхронно
process_image(image)

# В очереди
queue.enqueue('process_image', image)
```

## Инструменты анализа

- Static code analysis
- Route scanning
- Job class detection
- Service provider analysis
