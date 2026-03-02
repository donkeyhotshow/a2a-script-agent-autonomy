# SSE Implementation - Complete

> **⚠️ УСТАРЕВШИЙ ДОКУМЕНТ**
> 
> Этот документ описывает старую реализацию SSE. Актуальная документация:
> - [new-request-flow/SIMULATION-LLM-PROXY.md](../../new-request-flow/SIMULATION-LLM-PROXY.md)

## Overview

Server-Sent Events (SSE) для real-time коммуникации между клиентом и сервером.

## Architecture

```
Клиент (браузер)  <--HTTP-->  Сервер (Express)
      |                        |
      +--- EventSource ----->  |
      (открыт постоянно)       |
      <---- events -----------+
      (логи, прогресс, статусы)
```

## API Endpoints

### Server

**GET /api/v1/sse**

- Глобальный поток событий
- Требует аутентификации

**GET /api/v1/sse/:sessionId**

- Поток событий для конкретной сессии
- Требует аутентификации
- Параметры: `sessionId` - ID сессии

### Event Types

| Event       | Description            | Data                                     |
|-------------|------------------------|------------------------------------------|
| `connected` | Установлено соединение | `{ sessionId, timestamp }`               |
| `log`       | Лог сообщение          | `{ message, level, timestamp }`          |
| `progress`  | Прогресс выполнения    | `{ current, total, message, timestamp }` |
| `status`    | Изменение статуса      | `{ status, details, timestamp }`         |
| `complete`  | Завершено              | `{ result, timestamp }`                  |
| `error`     | Ошибка                 | `{ error, timestamp }`                   |

## Client Usage

### Initialization

```
javascript
// Подключить скрипт в HTML
<script src="/js/sse-client.js"></script>

// Подключиться к сессии
SSEClient.connect('session-123');

// Или к глобальному потоку
SSEClient.connect();
```

### Event Handlers

```
javascript
// Логи
SSEClient.on('log', (data) => {
  console.log(data.message, data.level);
});

// Прогресс
SSEClient.on('progress', (data) => {
  console.log(`${data.current}/${data.total}`, data.message);
});

// Статус
SSEClient.on('status', (data) => {
  console.log('Status:', data.status);
});

// Завершено
SSEClient.on('complete', (data) => {
  console.log('Result:', data.result);
});

// Ошибка
SSEClient.on('error', (data) => {
  console.error(data.error);
});
```

### Methods

```
javascript
// Отключиться
SSEClient.disconnect();

// Проверить подключение
SSEClient.isConnected();

// Удалить обработчик
SSEClient.off('log', myHandler);
```

## Integration with Sessions

### Before (Polling)

```
javascript
// Старый код с polling
setInterval(async () => {
  const status = await fetch(`/api/v1/requests/${promiseId}/status`);
  // ...
}, 5000);
```

### After (SSE)

```
javascript
// Новый код с SSE
SSEClient.connect(sessionId);

SSEClient.on('progress', (data) => {
  updateProgressBar(data.current, data.total);
});

SSEClient.on('log', (data) => {
  appendLog(data.message, data.level);
});

SSEClient.on('complete', (data) => {
  showResult(data.result);
});
```

## Server Events API

### From Server Code

```
javascript
import { sseManager } from './routes/sse.routes.js';

// Отправить лог
sseManager.log(sessionId, 'Starting process...', 'info');

// Отправить прогресс
sseManager.progress(sessionId, 5, 10, 'Processing files...');

// Отправить статус
sseManager.status(sessionId, 'running', { step: 5 });

// Завершено
sseManager.complete(sessionId, { success: true, data: {} });

// Ошибка
sseManager.error(sessionId, 'Failed to process file');
```

## Files

- `a2a-server/src/routes/sse.routes.ts` - Server implementation
- `a2a-client/web/js/sse-client.js` - Client implementation

## Benefits vs Polling

| Polling             | SSE                        |
|---------------------|----------------------------|
| Запрос каждые 5 сек | Мгновенная доставка        |
| Лишний трафик       | Одно постоянное соединение |
| Задержка до 5 сек   | Реальное время             |
| many HTTP requests  | 1 connection               |
