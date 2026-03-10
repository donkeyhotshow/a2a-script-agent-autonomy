# Устаревшие компоненты в a2a-client/web после введения протоколов

## 1. CSS архивы

### ✅ Устаревшие файлы (можно удалить):

| Файл | Причина |
|------|---------|
| `a2a-client/web/css/components/archive.css` | Аpхивные стили, не используются |
| `a2a-client/web/css/components/task-flow-archive.css` | Архивные стили task-flow |

## 2. Polling логика

### ✅ Удалены в ходе исправлений:

| Файл | Метод | Статус |
|------|-------|--------|
| `api-integration.js` | `_startPromisePolling()` | ✅ Удален |
| `progress-indicators.js` | `pollPromiseId()` | ✅ Удален |

### ⚠️ Требующие внимания:

| Файл | Метод/Код | Рекомендация |
|------|-----------|--------------|
| `transport/poll-transport.js Весь файл` | Polling Transport | Оставить как stub для обратной совместимости |

## 3. Методы и свойства для удаления

### progress-indicators.js

| Метод/Свойство | Строка | Причина |
|----------------|--------|---------|
| `_pollingIntervals` | 492 | Используется для хранения интервалов polling - больше не нужно |
| `cleanup()` - очистка polling | 680-683 | Очистка _pollingIntervals больше не нужна |

### api-integration.js

| Метод/Свойство | Строка | Причина |
|----------------|--------|---------|
| `currentPromiseId` | 258 | Хранение promiseId локально - теперь обрабатывается SDK |
| Debug логи | 261 | `console.log('[api-integration] Received promiseId:'` - удалить |

## 4. Старые паттерны

### ❌ Устаревшие паттерны:

```javascript
// БОЛЬШЕ НЕ ИСПОЛЬЗОВАТЬ:
// 1. Ручной polling
setInterval(() => {
    fetch(`/api/v1/requests/${promiseId}/status`)
}, pollInterval);

// 2. Прямые запросы к /api/promises/*
fetch(`/api/promises/${promiseId}`);

// 3. Локальное отслеживание состояния promiseId
this.currentPromiseId = result.promiseId;
```

### ✅ Новые паттерны (по протоколу):

```javascript
// 1. Обработка execute.ui от SDK
if (result.execute?.ui) {
    this.emit('uiStateChange', {
        promiseId: this.currentPromiseId,
        ui: result.execute.ui
    });
}

// 2. Подписка на SSE события от SDK
this.on('uiStateChange', (data) => {
    updateProgress(data.ui);
});
```

## 5. Файлы требующие обновления

### transport/

| Файл | Текущее состояние | Рекомендация |
|------|-------------------|--------------|
| `transport/poll-transport.js` | Stub (не делает polling) | Оставить, пометить как deprecated |
| `transport/sse-transport.js` | Активен | Используется для execute.ui |
| `transport/websocket-transport.js` | Активен | Используется как fallback |

## 6.行动计划

### Приоритет 1 (Удалить):

- [ ] Удалить `archive.css`
- [ ] Удалить `task-flow-archive.css`

### Приоритет 2 (Очистка кода):

- [ ] Удалить `_pollingIntervals` из progress-indicators.js
- [ ] Удалить debug логи из api-integration.js
- [ ] Удалить `currentPromiseId` если не используется

### Приоритет 3 (Комментарии):

- [ ] Добавить @deprecated в poll-transport.js
- [ ] Добавить комментарии о новом протоколе в файлы

## 7. Соответствие протоколам

После очистки веб-клиент будет соответствовать:

- ✅ `execute.ui` генерируется в SDK
- ✅ Web UI получает execute.ui через SSE от SDK
- ✅ Нет дублирующего polling
- ✅ Единый поток данных: Server → SDK → Web UI
