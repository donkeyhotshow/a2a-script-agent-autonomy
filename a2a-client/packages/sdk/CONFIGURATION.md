# Конфигурация Client SDK для связи с a2a-server

## Обзор

Client SDK (port 3001) взаимодействует с a2a-server (port 3000) через функцию [`serverFetch()`](src/server/index.ts:527). Связь настраивается через конфигурационный файл.

## Структура конфигурации

### Расположение файлов

Единый каталог хранилища: `a2a-client/storage/` (переопределяется через `A2A_CLIENT_STORAGE_DIR`).

| Компонент | Путь | Описание |
|-----------|------|----------|
| Конфигурация | `a2a-client/storage/config.json` | Настройки подключения к server |
| Проекты | `a2a-client/storage/projects.json` | Список проектов |
| Сессии | `a2a-client/storage/sessions/` | Данные сессий |

### Формат config.json

```json
{
  "serverUrl": "http://localhost:3000/api/v1",
  "token": "a2a_dev_password"
}
```

**Поля:**
- `serverUrl` - URL a2a-server API (по умолчанию: `http://localhost:3000/api/v1`)
- `token` - Токен авторизации (опционально, для защищенного подключения)

## Способы настройки

### 1. Через config.json (рекомендуемый)

Создайте или отредактируйте файл `a2a-client/storage/config.json`:

```json
{
  "serverUrl": "http://localhost:3000/api/v1",
  "token": "ваш_токен_здесь"
}
```

### 2. Через переменные окружения

```bash
# Для Client SDK
export A2A_CLIENT_STORAGE_DIR=/path/to/storage

# Для a2a-server
export A2A_SERVER_URL=http://localhost:3000/api/v1
export A2A_SERVER_PASSWORD=ваш_пароль
```

### 3. Через API Client SDK

```bash
# Получить текущую конфигурацию
curl http://localhost:3001/api/config

# Обновить конфигурацию
curl -X POST http://localhost:3001/api/config \
  -H "Content-Type: application/json" \
  -d '{"serverUrl":"http://localhost:3000/api/v1","token":"ваш_токен"}'
```

## Проверка связи

### Быстрая проверка

```bash
# 1. Проверить конфигурацию
curl http://localhost:3001/api/config

# 2. Проверить здоровье server
curl http://localhost:3000/health

# 3. Тестовый вызов
curl -X POST http://localhost:3001/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{"task":"test"}'
```

### Автоматический тест

```bash
cd a2a-client/packages/sdk
npx tsx scripts/test-server-connection.ts
```

## Архитектура связи

```
┌─────────────────┐         ┌─────────────────┐
│  Client SDK    │         │  a2a-server     │
│  (port 3001)   │────────▶│  (port 3000)    │
│                │ fetch   │                 │
│ serverFetch()  │ /invoke │ handleInvoke()  │
└─────────────────┘         └─────────────────┘
```

### Поток данных

1. Клиент отправляет запрос на `/api/v1/invoke` (Client SDK)
2. Client SDK вызывает [`serverFetch()`](src/server/index.ts:527) с `/invoke`
3. [`serverFetch()`](src/server/index.ts:527) читает конфигурацию через [`loadConfig()`](src/server/index.ts:443)
4. Запрос пересылается на `a2a-server:3000/api/v1/invoke`
5. a2a-server обрабатывает запрос и возвращает `promiseId`
6. Клиент опрашивает статус через `a2a-server:3000/api/v1/requests/:promiseId/status`

## Аутентификация

### Типы аутентификации

1. **Без аутентификации** (по умолчанию в development)
   - `SKIP_AUTH=1` на server
   - Токен не требуется

2. **С токеном**
   - Установите `token` в config.json
   - Токен передается как `Authorization: Bearer <token>`

### Пароль по умолчанию

- **Пароль:** `a2a_dev_password`
- **Переменная:** `A2A_SERVER_PASSWORD`

## Устранение проблем

### Ошибка: "Connection refused"

**Причина:** a2a-server не запущен

**Решение:**
```bash
cd a2a-server
npm run dev
```

### Ошибка: "Authorization required"

**Причина:** Требуется аутентификация

**Решение:**
1. Установите `SKIP_AUTH=1` на server, или
2. Добавьте токен в config.json

### Ошибка: "Invalid credentials"

**Причина:** Неверный токен

**Решение:** Проверьте соответствие токена в config.json и пароля на server

## Примеры использования

### JavaScript/TypeScript

```typescript
import { Client } from '@anthropic-ai/sdk';

const client = new Client({
  baseURL: 'http://localhost:3001/api/v1',
});

// Отправка задачи
const response = await client.invoke({
  task: 'Проанализируй файл readme.md',
  sessionId: 'session-123',
});
```

### cURL

```bash
# Вызов с указанием session
curl -X POST http://localhost:3001/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Создай файл test.txt с текстом Hello",
    "sessionId": "my-session"
  }'
```
