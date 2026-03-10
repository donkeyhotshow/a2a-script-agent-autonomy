# Протокол состояния: pending

## Описание

Состояние `pending` означает, что запрос принят, но еще не начал обрабатываться. Это начальное состояние для асинхронных операций.

## Когда используется

- Запрос отправлен на сервер
- AI Hub обрабатывает запрос (длительная операция)
- Сервер передал `promiseId`

## Формат ответа сервера

### Server → Client API

```json
{
  "promiseId": "promise_abc123",
  "status": "pending",
  "context": {
    "task": "описание задачи"
  }
}
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `promiseId` | string | ✅ | Уникальный ID для polling |
| `status` | string | ✅ | Всегда "pending" |
| `context` | object | ❌ | Контекст запроса |

## Поток выполнения

```
1. Client API отправляет запрос на Server
2. Server передает запрос в AI Hub
3. AI Hub возвращает promiseId
4. Server возвращает { promiseId, status: "pending" }
5. Client API начинает polling
```

## Client API поведение

### Polling цикл

```javascript
// Начало polling
async function startPolling(promiseId) {
  while (true) {
    const response = await fetch(`/api/promises/${promiseId}`);
    const data = await response.json();
    
    if (data.status === 'completed') {
      // Обработать результат
      handleResult(data.result);
      break;
    } else if (data.status === 'error') {
      // Обработать ошибку
      handleError(data.error);
      break;
    }
    
    // Ждать перед следующим запросом
    await sleep(getBackoffDelay(attempt));
  }
}
```

### Интервал опроса

| Попытка | Задержка |
|---------|----------|
| 1 | 1 сек |
| 2 | 2 сек |
| 3 | 4 сек |
| 4 | 8 сек |
| 5+ | 30 сек (max) |

## UI отображение

**Важно:** Client API (a2a-client/packages/sdk) добавляет UI команды на основе ответа сервера.

Server возвращает только:
```json
{
  "promiseId": "promise_abc123",
  "status": "pending"
}
```

Client API транслирует это в UI:

```json
{
  "execute": {
    "ui": {
      "state": "loading",
      "message": "AI обрабатывает ваш запрос...",
      "spinner": true,
      "promiseId": "promise_abc123"
    }
  }
}
```

## Варианты развития

### 1. Успешное завершение

```
pending → completed
```

### 2. Ошибка

```
pending → error
```

### 3. Длительная операция (Promise)

```
pending → waiting (poll результат)
```

## Примеры

### Пример 1: Начало асинхронного запроса

**Client API → Server:**
```json
{
  "context": {
    "task": "проанализируй код"
  }
}
```

**Server → Client API:**
```json
{
  "promiseId": "promise_xyz789",
  "status": "pending",
  "context": {
    "task": "проанализируй код"
  }
}
```

### Пример 2: Polling результата

**Client API → Server:**
```
GET /api/promises/promise_xyz789
```

**Server → Client API:**
```json
{
  "promiseId": "promise_xyz789",
  "status": "pending",
  "progress": 45
}
```

## Таймауты

| Параметр | Значение | Описание |
|----------|----------|----------|
| Max wait time | 5 минут | Максимальное время ожидания |
| Default interval | 5 секунд | Интервал опроса по умолчанию |

## Связанные файлы

- [PROMISE-WAITING.md](../../STAGES/simulations/PROMISE-WAITING.md)
- [server-invoke-response-pending.schema.json](../../json-schemas/server-invoke-response-pending.schema.json)

## Следующий шаг

После изменения статуса:
- `completed` → переходит к [Этап 5: Завершение](../STAGES/05-completion.md)
- `error` → переходит к [error](error.md)
