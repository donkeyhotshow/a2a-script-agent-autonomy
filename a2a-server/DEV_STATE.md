# DEV_STATE - a2a-server

> Серверная часть: Request Processing, Storage, AI Integration

## Подсистемы проекта

Подсистемы проекта описаны в общем [`DEV_STATE.md`](../DEV_STATE.md).

### Общая архитектура системы
Общая архитектура системы описана в [`DEV_STATE.md`](../DEV_STATE.md).

---

## Серверные проблемы

### 1. Request Processing

#### API Endpoints

| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | `/health` | Liveness probe |
| GET | `/api/v1/health` | Detailed health |
| POST | `/api/v1/requests` | Создать запрос |
| GET | `/api/v1/requests/:promiseId/status` | Статус запроса |
| POST | `/api/v1/invoke` | Универсальный endpoint для invoke |
| GET/POST/PUT/DELETE | `/api/v1/storage/:namespace/:key` | Storage API |
| DELETE | `/api/v1/storage/:namespace` | Очистка namespace |
| GET | `/api/v1/storage/:namespace/keys` | Список ключей |
| GET | `/metrics` | Prometheus метрики |
| GET | `/api/v1/queue/metrics` | Метрики очереди |

#### Важные исправления

1. **A2A Server endpoints:** `/invoke` → `/api/v1/invoke`
2. **Invoke service:** Исправлен приоритет result в `invoke.service.ts`

---

### 2. Session Management

#### Формат хранения

```
a2a-client/storage/sessions/{sessionId}/
├── 1/
│   ├── client-result.json      # Ввод пользователя
│   ├── request-to-server.json # Запрос к A2A Server
│   ├── server-response.json   # Ответ сервера
│   ├── server-promise.json   # Статус промиса
│   └── messages.json          # История сообщений
├── 2/
│   └── ...
└── ...
```

#### Очистка сессий

| Компонент | Место хранения | Очистка |
|-----------|---------------|---------|
| Сессии пользователей | PostgreSQL (таблица sessions) | Не реализована |
| История запросов | PostgreSQL (таблица requests) | Не реализована |
| Логи запросов | Файловая система | Не реализована |

**Рекомендуемые действия:**
- TTL для сессий (старше N дней)
- Очистка истории (архивирование или удаление)
- Ротация логов

---

### 3. AI Integration

#### Интеграция с AI Hub

| Параметр | Значение |
|----------|----------|
| AI_HUB_URL | http://localhost:11435 |
| OLLAMA_MODEL | qwen3:8b |
| LLM_PROVIDER | ollama |

#### Потоки данных

**Синхронный запрос (без LLM):**
```
Client → POST /api/v1/requests → a2a-server → (neuron processing) → response
```

**Асинхронный запрос (с LLM):**
```
Client → POST /api/v1/requests → a2a-server → AI_HUB_URL (proxy) → Ollama
                                          ↓
                               Создание promise
                                          ↓
                          a2a-server возвращает promiseId
                                          ↓
                             Proxy Daemon (polling every 4s)
                                          ↓
                          GET /promises/pending → Находит тикет
                                          ↓
                          POST /promise/<id>/execute → Ollama
                                          ↓
                          Результат сохраняется в файл
```

---

## Конфигурация

| Переменная | Описание | Значение |
|------------|----------|----------|
| LLM_PROVIDER | Провайдер LLM | ollama |
| AI_HUB_URL | URL прокси | http://localhost:11435 |
| OLLAMA_MODEL | Модель Ollama | qwen3:8b |
| SKIP_AUTH | Пропустить авторизацию | 1 |
| RATE_LIMIT_WINDOW_MS | Окно rate limiting (мс) | 60000 |
| RATE_LIMIT_MAX_REQUESTS | Макс. запросов в окне | 200 |
| LOG_LEVEL | Уровень логирования | info |
| LOG_FORMAT | Формат логов | json |

---

## Возможные будущие проблемы

### 1. Проблемы с базой данных

| Проблема | Описание | Решение |
|----------|----------|---------|
| PostgreSQL недоступна | Запросы завершаются с ошибкой | Health check, retry |
| Миграции БД | При обновлении возможны проблемы | Версионирование миграций |
| Переполнение таблиц | Таблицы могут переполняться | Индексы, партиционирование |

### 2. Проблемы с производительностью

| Проблема | Описание | Решение |
|----------|----------|---------|
| Высокая нагрузка | Большое количество запросов | Rate limiting, queue |
| Блокировка I/O | Синхронные операции | Async/await |
| Утечки памяти | Увеличивается потребление | Регулярный перезапуск |

### 3. Проблемы с аутентификацией

| Проблема | Описание | Решение |
|----------|----------|---------|
| JWT истечение | Токены истекают | Auto-refresh token |
| Skip Auth в продакшене | Опасен в production | Проверка окружения |
| CORS проблемы | Ограничения браузеров | Правильная настройка CORS |

---

## Тестирование

### Проверка сервисов

```bash
# Тест 1: Проверка a2a-server
curl -s http://localhost:3000/health
# Результат: {"status":"ok","timestamp":"2026-03-06T12:10:00.897Z","version":"1.0.0"}

# Тест 2: Создание запроса
curl -s -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -H "x-skip-auth: true" \
  -d '{"message":"Hello","context":{},"sessionId":"test-session-1"}'

# Тест 3: Invoke
curl -s -X POST http://localhost:3000/api/v1/invoke -H "Content-Type: application/json" \
  -d '{"task":"Привет, как дела?"}'
```

---

## Архитектура

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│ a2a-server  │────▶│   Proxy     │────▶│   Ollama    │
│  (HTTP/WS)  │     │  :3000     │     │  :11435    │     │   :11434    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                            │                   │
                            │                   │
                     ┌──────┴──────┐    ┌──────┴──────┐
                     │   Database  │    │   Daemon    │
                     │ PostgreSQL  │    │ (built-in)  │
                     │   :5433     │    │ polling     │
                     └─────────────┘    └─────────────┘
```

---

*Обновлено: 2026-03-20*
