# A2A Client Mocks

Система мокирования для тестирования a2a-client SDK без зависимости от реального сервера.

## Структура

```
tests/mocks/
├── index.ts                 # Центральный экспорт
├── server/                  # Мок A2A сервера
│   ├── index.ts
│   └── mock-a2a-server.ts
├── http/                    # Мок HTTP/fetch
│   ├── index.ts
│   └── mock-fetch.ts
└── storage/                 # Мок storage (localStorage/sessionStorage)
    ├── index.ts
    └── mock-storage.ts
```

## Быстрый старт

### Использование Mock A2A Server

```typescript
import { createMockA2AServer, serverFixtures } from './mocks/server/mock-a2a-server.js';
import { vi } from 'vitest';

// Создание мок-сервера
const server = createMockA2AServer({
    verbose: true,
    delay: 100
});

// Использование в тестах
test('should call invoke endpoint', async () => {
    // Мок как fetch функция
    globalThis.fetch = server.getMockFetchFn();
    
    const response = await fetch('http://localhost:3000/api/v1/invoke', {
        method: 'POST',
        body: JSON.stringify(serverFixtures.invokeRequest())
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
});
```

### Использование MockFetch

```typescript
import { MockFetch, commonMocks } from './mocks/http/mock-fetch.js';

const mockFetch = new MockFetch();

// Добавление моков
mockFetch.addMock({
    url: 'http://api.example.com/data',
    response: commonMocks.okJson({ test: true })
});

//Использование
const fetchFn = mockFetch.getMock();
const response = await fetchFn('http://api.example.com/data');
const data = await response.json();
```

### Использование MockStorage

```typescript
import { createMockStorage } from './mocks/storage/mock-storage.js';

const storage = createMockStorage({
    initialData: { key: 'value' }
});

// Использование как localStorage
storage.setItem('test', 'data');
expect(storage.getItem('test')).toBe('data');
```

## Mock A2A Server

Эмулирует поведение A2A сервера с поддержкой эндпоинтов:

- `POST /api/v1/invoke` - создание запроса
- `GET /api/v1/requests/:id/status` - получение статуса

### Конфигурация

```typescript
const server = createMockA2AServer({
    baseUrl: 'http://localhost:3000',
    delay: 100,           // Задержка ответа в мс
    verbose: true,        // Логирование
    handlers: {          // Кастомные обработчики
        onInvoke: (req) => ({ success: true, promiseId: 'custom' }),
        onStatus: (id) => ({ success: true, status: 'completed' })
    },
    defaultInvokeResponse: { /* кастомный ответ */ },
    defaultStatusResponse: { /* кастомный ответ */ }
});
```

### Методы

- `handleInvoke(request)` - обработать запрос invoke
- `handleStatus(promiseId)` - получить статус
- `handleSSE(sessionId)` - получить SSE поток
- `getMockFetchFn()` - получить функцию для подмены globalThis.fetch
- `addPendingPromise(id, response)` - добавить ожидающий промис
- `addSessionData(id, messages)` - добавить данные сессии

## MockFetch

Мок для fetch с поддержкой:

- Точное соответствие URL
- Wildcard (*)
- RegExp паттерны
- HTTP методы
- Ограничение использования (uses)
- Динамические ответы
- Запись запросов

### Методы

- `addMock(options)` - добавить мок
- `addInvokeMock(response)` - мок для invoke
- `addStatusMock(promiseId, response)` - мок для status
- `addSSEMock(sessionId, response)` - мок для SSE
- `getMock()` - получить функцию fetch
- `getRequests()` - получить все запросы
- `wasRequested(url)` - проверить был ли запрос

### commonMocks

Готовые мок-ответы:

- `okJson(data)` - 200 OK
- `invokeResponse(promiseId, result)` - ответ invoke
- `statusResponse(status, result)` - ответ статуса
- `createdJson(data)` - 201 Created
- `notFound(message)` - 404 Not Found
- `error(status, message)` - ошибка
- `timeout()` - 408 Timeout
- `serverError(message)` - 500 Internal Error

## MockStorage

Мок для localStorage/sessionStorage:

### Методы

- `getItem(key)` - получить значение
- `setItem(key, value)` - установить значение
- `removeItem(key)` - удалить значение
- `clear()` - очистить всё
- `key(index)` - получить ключ по индексу
- `length` - количество элементов
- `hasKey(key)` - проверить существование
- `getKeys()` - получить все ключи
- `getAll()` - получить все данные
- `setMultiple(data)` - установить несколько
- `reset()` - сбросить к начальному состоянию

### Глобальная установка

```typescript
import { installGlobalStorage } from './mocks/storage/mock-storage.js';

// Note: localStorage is deprecated in production code
// Use StorageAPI or SessionStore instead
// Mock available for legacy test compatibility only
installGlobalStorage();
```

**Note:** Production code uses `StorageAPI` (file-based) instead of localStorage. Update tests to use:
```typescript
await StorageAPI.default.setItem('key', 'value');
const value = await StorageAPI.default.getItem('key');
```

## Интеграция с Vitest

### Пример теста

```typescript
import { test, expect, beforeEach, describe } from 'vitest';
import { createMockA2AServer } from './mocks/server/mock-a2a-server.js';

describe('API Client', () => {
    let server: MockA2AServer;

    beforeEach(() => {
        server = createMockA2AServer();
        globalThis.fetch = server.getMockFetchFn();
    });

    test('should call API', async () => {
        const response = await fetch('/api/v1/invoke', {
            method: 'POST',
            body: JSON.stringify({ context: {} })
        });
        
        expect(response.ok).toBe(true);
    });
});
```

## Интеграция с Playwright

```typescript
import { test, expect } from '@playwright/test';

test('should work with mocks', async ({ page }) => {
    // Перехват запросов
    await page.route('**/api/v1/invoke', async (route) => {
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                promiseId: 'test_001',
                result: { form: { message: 'Test' } }
            })
        });
    });

    await page.goto('/');
    // Тест логики...
});
```

## Запуск тестов

```bash
# Unit тесты
cd a2a-client
npm run test

# E2E тесты (с моками)
npm run test:e2e

# С моками
npm run test:e2e -- mock-driven.spec.ts
```

## Типы

Все типы экспортируются из соответствующих модулей:

```typescript
import type { 
    MockA2AServerConfig,
    A2AEndpointHandlers,
    A2ARequest,
    A2AResponse 
} from './mocks/server/mock-a2a-server.js';

import type { 
    MockFetchResponse, 
    MockFetchOptions, 
    MockFetchConfig 
} from './mocks/http/mock-fetch.js';

import type { 
    MockStorageConfig, 
    StorageData 
} from './mocks/storage/mock-storage.js';
```
