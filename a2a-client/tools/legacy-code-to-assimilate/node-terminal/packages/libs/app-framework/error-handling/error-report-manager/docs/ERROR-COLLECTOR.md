# Система сбора ошибок и автоматического создания задач

## Обзор

Система сбора ошибок Projects Manager автоматически перехватывает все ошибки в приложении, анализирует их и создает задачи через TaskManager для дальнейшего отслеживания и решения.

## Архитектура

### Основные компоненты

1. **ErrorCollector** (`core/ErrorCollector.js`) - Центральный сборщик ошибок
2. **GlobalErrorHandler** (`utils/globalErrorHandler.js`) - Глобальный обработчик ошибок
3. **TaskManager** (`libs/task-manager/`) - Система управления задачами
4. **API Endpoints** - REST API для работы с ошибками
5. **UI Components** - Пользовательский интерфейс

### Схема работы

```
Ошибка → GlobalErrorHandler → ErrorCollector → TaskManager → Задача
   ↓
Анализ паттерна → Классификация → Создание задачи → UI отображение
```

## Установка и настройка

### Автоматическая инициализация

Система автоматически инициализируется при запуске приложения:

```javascript
// В index.js
const globalErrorHandler = require('./utils/globalErrorHandler');
await globalErrorHandler.initialize();
```

### Ручная инициализация

```javascript
const ErrorCollector = require('./core/ErrorCollector');

const errorCollector = new ErrorCollector({
  projectRoot: process.cwd(),
  maxErrorsPerPattern: 10,
  errorCooldown: 60000 // 1 минута
});

await errorCollector.initialize();
```

## Использование

### Автоматический сбор ошибок

Система автоматически перехватывает:

- Необработанные исключения (`uncaughtException`)
- Необработанные промисы (`unhandledRejection`)
- Ошибки Express (`express error handler`)
- Ошибки в процессах сервисов

### Ручной сбор ошибок

```javascript
const globalErrorHandler = require('./utils/globalErrorHandler');

// Сбор ошибки с контекстом
await globalErrorHandler.collectError({
  appId: 'my-app',
  error: new Error('Service failed to start'),
  context: {
    service: 'auth-service',
    port: 3000,
    timestamp: new Date().toISOString()
  },
  source: 'service-manager',
  severity: 'high'
});
```

### В UI (Vue.js)

```javascript
import { useErrorCollector } from '../composables/services/useErrorCollector'

const { autoCollectError } = useErrorCollector()

// Автоматический сбор ошибки
try {
  // Код, который может вызвать ошибку
} catch (error) {
  await autoCollectError(error, {
    appId: 'ui',
    source: 'user-action',
    severity: 'medium'
  })
}
```

## Паттерны ошибок

### Встроенные паттерны

Система автоматически классифицирует ошибки по следующим паттернам:

| Код | Паттерн | Приоритет | Категория | Описание |
|-----|---------|-----------|-----------|----------|
| `PORT_ALREADY_IN_USE` | `EADDRINUSE\|port.*already.*in.*use` | high | system | Порт уже занят |
| `PERMISSION_DENIED` | `EACCES\|permission.*denied` | high | system | Отказано в доступе |
| `FILE_NOT_FOUND` | `ENOENT\|file.*not.*found` | medium | config | Файл не найден |
| `CONNECTION_REFUSED` | `ECONNREFUSED\|connection.*refused` | high | network | Соединение отклонено |
| `TIMEOUT` | `ETIMEDOUT\|timeout` | medium | network | Таймаут соединения |
| `MEMORY_ERROR` | `ENOMEM\|memory.*error` | critical | system | Ошибка памяти |
| `STARTUP_FAILURE` | `startup.*failure\|failed.*to.*start` | high | service | Ошибка запуска |
| `SERVICE_CRASH` | `process.*exited\|service.*crashed` | critical | service | Крах сервиса |
| `CONFIG_ERROR` | `config.*error\|invalid.*config` | medium | config | Ошибка конфигурации |
| `API_ERROR` | `api.*error\|http.*error` | medium | api | Ошибка API |

### Добавление пользовательских паттернов

```javascript
// Через API
POST /api/unified/errors/patterns
{
  "code": "CUSTOM_ERROR",
  "pattern": "custom.*error.*pattern",
  "priority": "high",
  "tags": ["custom", "business"],
  "category": "business"
}

// Программно
globalErrorHandler.addErrorPattern('CUSTOM_ERROR', 'custom.*error.*pattern', {
  priority: 'high',
  tags: ['custom', 'business'],
  category: 'business'
});
```

## API Endpoints

### Статистика ошибок

```http
GET /api/unified/errors/stats
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "totalErrors": 15,
    "byCategory": {
      "system": 5,
      "network": 3,
      "service": 7
    },
    "byPriority": {
      "critical": 2,
      "high": 8,
      "medium": 5
    },
    "byPattern": {
      "PORT_ALREADY_IN_USE": 3,
      "SERVICE_CRASH": 2,
      "STARTUP_FAILURE": 5
    }
  }
}
```

### Сбор ошибки

```http
POST /api/unified/errors/collect
{
  "appId": "my-app",
  "error": "Service failed to start",
  "context": {
    "service": "auth-service",
    "port": 3000
  },
  "source": "service-manager",
  "severity": "high"
}
```

### Получение задач

```http
GET /api/unified/errors/tasks?appId=my-app&priority=high
```

### Очистка старых задач

```http
POST /api/unified/errors/cleanup
{
  "olderThan": "7d",
  "dryRun": false
}
```

### Сброс счетчиков

```http
POST /api/unified/errors/reset
```

## UI Компоненты

### ErrorCollectorPanel

Основной компонент для отображения ошибок и задач:

```vue
<template>
  <ErrorCollectorPanel />
</template>

<script setup>
import ErrorCollectorPanel from '../components/ErrorCollectorPanel.vue'
</script>
```

### Использование composable

```javascript
import { useErrorCollector } from '../composables/services/useErrorCollector'

const {
  errorStats,
  errorTasks,
  fetchErrorStats,
  fetchErrorTasks,
  autoCollectError
} = useErrorCollector()

// Инициализация
await initialize()

// Получение данных
await fetchErrorStats()
await fetchErrorTasks()

// Сбор ошибки
await autoCollectError(new Error('Test error'), {
  appId: 'test',
  source: 'test',
  severity: 'medium'
})
```

## Конфигурация

### Настройки ErrorCollector

```javascript
const errorCollector = new ErrorCollector({
  projectRoot: process.cwd(),
  maxErrorsPerPattern: 10,        // Максимум ошибок одного типа
  errorCooldown: 60000,           // Кулдаун между ошибками (мс)
});
```

### Настройки GlobalErrorHandler

```javascript
const globalErrorHandler = new GlobalErrorHandler({
  captureUnhandledRejections: true,  // Перехват необработанных промисов
  captureUncaughtExceptions: true,   // Перехват необработанных исключений
});
```

## Мониторинг и аналитика

### Статистика

Система предоставляет детальную статистику:

- Общее количество ошибок
- Распределение по категориям
- Распределение по приоритетам
- Распределение по паттернам
- Количество открытых задач

### Отчеты

```javascript
// Получение статистики
const stats = globalErrorHandler.getErrorStats()

// Получение открытых задач
const openTasks = await globalErrorHandler.getOpenTasks({
  appId: 'my-app',
  priority: 'high'
})

// Очистка старых задач
const cleanupResult = await globalErrorHandler.cleanupOldTasks({
  olderThan: '7d',
  dryRun: false
})
```

## Интеграция с существующими системами

### ServiceManager

ErrorCollector интегрирован с ServiceManager для автоматического сбора ошибок сервисов:

```javascript
// В ServiceManager.js
const globalErrorHandler = require('../utils/globalErrorHandler');

// При ошибке запуска сервиса
await globalErrorHandler.collectError({
  appId: serviceId,
  error: startupError,
  context: { service: serviceConfig },
  source: 'service-manager',
  severity: 'high'
});
```

### Express Error Handler

Автоматическая интеграция с Express:

```javascript
// В Server.js
app.use(async (error, req, res, next) => {
  await globalErrorHandler.collectError({
    appId: 'api',
    error,
    context: {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent')
    },
    source: 'express',
    severity: 'medium'
  });
  
  next(error);
});
```

## Лучшие практики

### 1. Контекст ошибок

Всегда предоставляйте контекст при сборе ошибок:

```javascript
await globalErrorHandler.collectError({
  appId: 'my-app',
  error: error,
  context: {
    userId: user.id,
    action: 'create-user',
    input: { email: user.email },
    timestamp: new Date().toISOString()
  },
  source: 'user-service',
  severity: 'medium'
});
```

### 2. Приоритизация

Используйте правильные приоритеты:

- `critical` - Критические ошибки, требующие немедленного внимания
- `high` - Важные ошибки, влияющие на функциональность
- `medium` - Обычные ошибки
- `low` - Незначительные проблемы

### 3. Категоризация

Группируйте ошибки по категориям:

- `system` - Системные ошибки
- `network` - Сетевые ошибки
- `config` - Ошибки конфигурации
- `service` - Ошибки сервисов
- `api` - Ошибки API
- `business` - Бизнес-логика

### 4. Мониторинг

Регулярно проверяйте статистику ошибок:

```javascript
// Ежедневная проверка
const stats = globalErrorHandler.getErrorStats()
if (stats.totalErrors > 100) {
  // Отправить уведомление
}
```

## Устранение неполадок

### Проблемы инициализации

```javascript
// Проверка инициализации
if (!globalErrorHandler.isInitialized) {
  console.error('GlobalErrorHandler не инициализирован')
}

// Проверка TaskManager
if (!globalErrorHandler.errorCollector?.taskManager) {
  console.error('TaskManager недоступен')
}
```

### Проблемы сбора ошибок

```javascript
// Проверка лимитов
const stats = globalErrorHandler.getErrorStats()
console.log('Статистика ошибок:', stats)

// Сброс счетчиков
globalErrorHandler.resetErrorCounts()
```

### Проблемы с задачами

```javascript
// Проверка задач
const tasks = await globalErrorHandler.getOpenTasks()
console.log('Открытые задачи:', tasks)

// Очистка старых задач
const result = await globalErrorHandler.cleanupOldTasks({
  olderThan: '1d',
  dryRun: true
})
console.log('Задачи для удаления:', result)
```

## Расширение функциональности

### Кастомные обработчики ошибок

```javascript
class CustomErrorHandler extends GlobalErrorHandler {
  async collectError(options) {
    // Дополнительная логика
    await this.sendNotification(options)
    
    // Вызов родительского метода
    return await super.collectError(options)
  }
  
  async sendNotification(options) {
    // Отправка уведомлений
  }
}
```

### Интеграция с внешними системами

```javascript
// Интеграция с Slack
async sendToSlack(errorData) {
  const message = {
    text: `Ошибка в ${errorData.appId}: ${errorData.error.message}`,
    attachments: [{
      fields: [
        { title: 'Приоритет', value: errorData.priority },
        { title: 'Источник', value: errorData.source }
      ]
    }]
  }
  
  await fetch('https://hooks.slack.com/services/...', {
    method: 'POST',
    body: JSON.stringify(message)
  })
}
```
