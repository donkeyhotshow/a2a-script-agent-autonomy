# DEV_STATE - a2a-server (2026-03-06)

## A2A Server

### Проверка статуса сервисов

| Сервис | Порт | Статус | URL проверки |
|--------|------|--------|-------------|
| a2a-server | 3000 | ✅ Работает | http://localhost:3000/health |

### Конфигурация (переменные окружения в a2a-server/.env)

| Переменная | Описание | Значение |
|------------|----------|----------|
| LLM_PROVIDER | Провайдер LLM | ollama |
| AI_HUB_URL | URL прокси | http://localhost:11435 |
| OLLAMA_MODEL | Модель Ollama | qwen3:8b |
| SKIP_AUTH | Пропустить авторизацию | 1 |

### API Endpoints

| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | /health | Liveness probe |
| GET | /api/v1/health | Detailed health |
| POST | /api/v1/requests | Создать запрос |
| GET | /api/v1/requests/:promiseId/status | Статус запроса |

### Выполненные тесты

```bash
# Тест 1: Проверка a2a-server
curl -s http://localhost:3000/health
# Результат: {"status":"ok","timestamp":"2026-03-06T12:10:00.897Z","version":"1.0.0"}

# Тест 2: Создание запроса через a2a-server
curl -s -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -H "x-skip-auth: true" \
  -d '{"message":"Hello","context":{},"sessionId":"test-session-1"}'

# Результат:
{"success":true,"data":{"promiseId":"cmmevccg90004ra5advcazuex","requestId":"req_1772799992072_kxtze08b3","status":"pending"}}

# Тест 3: Проверка статуса запроса
curl -s http://localhost:3000/api/v1/requests/cmmevccg90004ra5advcazuex/status -H "x-skip-auth: true"

# Результат:
{"success":true,"data":{"promiseId":"cmmevccg90004ra5advcazuex","status":"pending","createdAt":"2026-03-06T12:26:32.073Z"}}

# Тест 4: Запрос через a2a-server (invoke)
curl -s -X POST http://localhost:3000/api/v1/invoke -H "Content-Type: application/json" \
  -d '{"task":"Привет, как дела?"}'
# Результат: {"promiseId":"cmmeusr8z0002ra5antz1s3qg","status":"pending"}
```

---

## Полная архитектура

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

### Потоки данных

#### 1. Синхронный запрос (без LLM)
```
Client → POST /api/v1/requests → a2a-server → (neuron processing) → response
```

#### 2. Асинхронный запрос (с LLM)
```
Client → POST /api/v1/requests → a2a-server → AI_HUB_URL (proxy) → Ollama
                                         ↓
                              Создание promise
                                         ↓
                         a2a-server возвращает promiseId
                                         ↓
Client ← promiseId + status=pending
                                         ↓
                            Proxy Daemon (polling every 4s)
                                         ↓
                         GET /promises/pending → Находит тикет
                                         ↓
                         POST /promise/<id>/execute → Ollama
                                         ↓
                         Результат сохраняется в файл
                                         ↓
Client → GET /api/v1/requests/:promiseId/status → Возвращает результат
```

---

## Тестирование нейронной обработки

### Тест создания запроса (нейронная обработка без LLM)

```bash
curl -s -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "context": {}}'
# Ответ: {"success":true,"data":{"promiseId":"cmme7q5ap00005921pm7g3dj6","requestId":"req_1772760325198_ln3jl2ttx","status":"pending"}}

# Проверка статуса:
curl -s http://localhost:3000/api/v1/requests/cmme7q5ap00005921pm7g3dj6/status
# Ответ: {"success":true,"data":{"promiseId":"...","status":"completed",...}}
```

### Выводы

- ✅ a2a-server (3000) работает и обрабатывает запросы
- ✅ Полная цепочка проверена: Client → a2a-server → neuron processing → response

---

## Возможные будущие проблемы

### 1. Проблемы с базой данных и персистентностью

| Проблема | Описание | Решение |
|----------|----------|--------|
| **PostgreSQL недоступна** | При недоступности БД запросы завершаются с ошибкой | Health check, retry логика, graceful degradation |
| **Миграции БД** | При обновлении схемы возможны проблемы | Версионирование миграций, rollback план |
| **Переполнение таблиц** | При длительной работе таблицы могут переполняться | Индексы, партиционирование, TTL |
| **Утечка соединений** | При ошибках соединения могут не закрываться | Connection pooling, cleanup on error |

### 2. Проблемы с нейронами и обработкой

| Проблема | Описание | Решение |
|----------|----------|--------|
| **Neuron not found** | При отсутствии нейрона запрос завершается ошибкой | Fallback нейроны, централизованный реестр |
| **Длительная обработка** | Нейроны могут обрабатывать запросы слишком долго | Timeout механизм, progress updates |
| **Конфликт нейронов** | Несколько нейронов могут конфликтовать при обработке | Приоритизация, mutex на уровне нейрона |
| **Ошибки в нейронах** | Нейроны могут выбрасывать необработанные ошибки | try-catch обёртки, error boundaries |

### 3. Проблемы с производительностью

| Проблема | Описание | Решение |
|----------|----------|--------|
| **Высокая нагрузка** | Большое количество запросов может перегрузить сервер | Rate limiting, queue, autoscaling |
| **Блокировка I/O** | Синхронные операции блокируют event loop | Async/await, worker threads |
| **Медленные ответы** | При большой нагрузке время отклика увеличивается | Мониторинг метрик, оптимизация запросов |
| **Утечки памяти** | При длительной работе увеличивается потребление памяти | Регулярный перезапуск, профилирование |

### 4. Проблемы с прокси и LLM

| Проблема | Описание | Решение |
|----------|----------|--------|
| **AI_HUB_URL недоступен** | При недоступности прокси LLM запросы не работают | Fallback на прямые провайдеры, retry |
| **Таймауты LLM** | Долгие ответы от LLM могут превышать timeout | Настройка timeout, streaming responses |
| **Невалидные ответы LLM** | LLM может вернуть невалидный JSON | Валидация ответов, error handling |
| **Перегрузка LLM** | Большое количество запросов к LLM | Ограничение параллельных запросов, queue |

### 5. Проблемы с аутентификацией и безопасностью

| Проблема | Описание | Решение |
|----------|----------|--------|
| **JWT истечение** | Токены истекают, запросы отклоняются | Auto-refresh token, graceful re-auth |
| **Skip Auth в продакшене** | SKIP_AUTH=1 опасен в production | Проверка окружения,强制 аутентификация |
| **Инъекции** | Вредоносный input в запросах | Input validation, sanitization |
| **CORS проблемы** | Ограничения при обращении с браузера | Правильная настройка CORS заголовков |

---

## Очистка сессий

### Текущее состояние

| Компонент | Место хранения | Очистка |
|-----------|---------------|---------|
| Сессии пользователей | PostgreSQL (таблица sessions) | Не реализована автоматически |
| История запросов | PostgreSQL (таблица requests) | Не реализована автоматически |
| Логи запросов | Файловая система (storage/logs/) | Не реализована автоматически |
| Временные файлы | storage/tmp/ | Не реализована автоматически |

### Проблемы

1. **Накопление сессий** - При длительной работе таблица sessions заполняется старыми данными
2. **Рост истории запросов** - Таблица requests растёт без ограничений
3. **Накопление логов** - Файлы логов могут занять много места на диске
4. **Временные файлы** - Директория tmp/ не очищается автоматически

### Рекомендуемые действия

| Действие | Описание | Приоритет |
|----------|----------|----------|
| **TTL для сессий** | Автоматическое удаление сессий старше N дней | Высокий |
| **Очистка истории** | Удаление старых запросов (archiving или удаление) | Высокий |
| **Ротация логов** | Настроить ротацию логов (по размеру или времени) | Средний |
| **Очистка tmp** | Удаление временных файлов старше 24 часов | Средний |
| **Мониторинг** | Добавить метрики использования диска и размера БД | Низкий |

### Пример SQL скрипта очистки

```sql
-- Очистка старых сессий (старше 7 дней)
DELETE FROM sessions 
WHERE "createdAt" < NOW() - INTERVAL '7 days';

-- Очистка старых запросов (старше 30 дней)
DELETE FROM requests 
WHERE "createdAt" < NOW() - INTERVAL '30 days';

-- Очистка завершённых промисов (старше 14 дней)
DELETE FROM promises 
WHERE status = 'completed' 
  AND "updatedAt" < NOW() - INTERVAL '14 days';
```

### Мониторинг размера данных

```bash
# Проверка размера таблиц в PostgreSQL
docker exec -it a2a-server-postgres psql -U postgres -d a2a_server -c "\
  SELECT 
    tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Подсчёт записей
docker exec -it a2a-server-postgres psql -U postgres -d a2a_server -c "\
  SELECT 'sessions' as table_name, COUNT(*) as count FROM sessions
  UNION ALL
  SELECT 'requests', COUNT(*) FROM requests
  UNION ALL
  SELECT 'promises', COUNT(*) FROM promises;"
```

---

## Тестирование

### Уровень 1: AI Integration (включён)

| Скрипт | Назначение | Статус |
|--------|------------|--------|
| `test-ai-integration.ps1` | Тестирование прокси и демона | ✅ Включён |

### Уровень 2: A2A Server

**Требование:** Тестирующий скрипт должен быть на этом уровне + предыдущий уровень.

| Скрипт | Назначение | Статус |
|--------|------------|--------|
| `test-a2a-server.ps1` | Тестирование API и нейронов | 📝 Требуется |

### Что должен проверять

- a2a-server доступен на порту 3000
- API endpoints отвечают корректно
- Нейроны обрабатывают запросы
- Интеграция с прокси (11435) работает
- База данных доступна
