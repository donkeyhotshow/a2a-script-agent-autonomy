# План полного запуска (Stateless версия)

## Полный цикл: Client → Server → AI → Response (туда и обратно)

> **Важно:** Сервер теперь stateless - не требует PostgreSQL, Redis, RabbitMQ.
> Все данные хранятся на Client API (JSON файлы).

---

## 1. Предварительные требования

### 1.1 Установленные компоненты
- Docker + Docker Compose (только для AI Integration)
- Node.js 18+ (для a2a-server и a2a-client)
- Python 3.9+ (для ai-integration прокси)
- **LLM backend** — по желанию: локальный HTTP-совместимый сервер и/или внешние провайдеры в конфиге прокси; репозиторий **`start-all` / `runbook-cli` не поднимает** отдельный «local LLM» процесс

### 1.2 Требуемые порты
| Порт | Компонент | Описание |
|------|-----------|----------|
| 11434 | AI Integration | Прокси / promise (**операторская точка C1** треугольника: `GET /health`) |
| 11435 | Local LLM upstream (типично) | Только если вы сами запускаете локальную LLM; URL задаётся `LOCAL_LLM_UPSTREAM_URL` / провайдерами |
| 3000 | a2a-server | A2A API сервер (stateless) |
| 3001 | a2a-client (SDK) | Client API (опционально; Web чаще Vite 5173 + `/api/a2a/*`) |
| 5173 | Vite Dev | Web UI |

> **Примечание:** Порты 5432 (PostgreSQL), 6379 (Redis), 5672 (RabbitMQ) больше не используются.

---

## 2. Последовательность запуска

> **Треугольник (см. `docs/TRIANGLE-WORKFLOW.md`):** первый контурный чек — **`GET http://localhost:11434/health`** (hub). Локальная LLM на **11435** — не часть `start-all`; поднимайте её отдельно, если `LOCAL_LLM_UPSTREAM_URL` указывает на неё.

### ЭТАП 1 (опционально): Локальный HTTP LLM

Если используете локальный upstream (часто порт **11435**):

```bash
# Команды зависят от дистрибутива. Проверка типичного API локального LLM:
curl http://localhost:11435/api/tags
```

Без доступного backend для прокси LLM-запросы из стека не выполнятся — либо поднимите upstream, либо настройте внешний провайдер в ai-integration.

### ЭТАП 2: Запуск AI Integration (прокси)

```bash
cd ai-integration
pip install -r requirements.txt
python -m proxy
```

### ЭТАП 3: Настройка переменных окружения

```bash
# Основные переменные (stateless - нет database/redis)
export LOCAL_LLM_UPSTREAM_URL="http://localhost:11435"
export LOCAL_LLM_MODEL="qwen3:8b"
export SKIP_AUTH="1"  # Только для dev!
export ENCRYPTION_KEY="12345678901234567890123456789012"  # 32 символа

# AI Integration (если запущен)
export AI_HUB_URL="http://localhost:11434"
```

> **Примечание:** `DATABASE_URL` и `REDIS_URL` больше не требуются!

### ЭТАП 4: Запуск a2a-server

```bash
cd a2a-server

# Установка зависимостей
npm install

# Запуск (stateless - no db needed!)
NODE_ENV=development npm run dev
```

**Проверка:**
```bash
curl http://localhost:3000/health
```

Ожидаемый ответ:
```json
{"status": "ok", "mode": "stateless"}
```

### ЭТАП 5: Запуск a2a-client

```bash
cd a2a-client

# Установка зависимостей
npm install

# Client API / dev-сервер пакета (часто порт 3001); Web UI в dev обычно 5173 + `/api/a2a/*`
npm run dev
```

### ЭТАП 6: Запуск Web UI

```bash
cd a2a-client/packages/web

# Установка зависимостей
npm install

# Запуск Web UI (port 5173)
npm run dev
```

---

## 3. Упрощенный запуск (все скриптом)

```bash
# start-all поднимает ai-integration (:11434), a2a-server, client-api, web-ui — без отдельного старта Local LLM.
# При необходимости поднимите upstream до/после и проверьте GET http://localhost:11434/health

./start-all.bat  # Windows
# или
./start-all.sh   # Linux/Mac (если есть)
```

---

## 4. Проверка работоспособности

### 4.1 Проверка компонентов

```bash
# Server (stateless)
curl http://localhost:3000/health
# {"status": "ok", "mode": "stateless"}

# Client API
curl http://localhost:3001/api/health
# {"status": "ok"}

# AI Integration (hub — основной gate)
curl http://localhost:11434/health

# Local LLM upstream (если настроен и запущен отдельно)
curl http://localhost:11435/api/tags
# {"models": [...]}
```

### 4.2 Проверка потока

```bash
# Создание сессии (standalone SDK на 3001) — alias /api/sessions или канон /api/a2a/sessions
curl -X POST http://localhost:3001/api/a2a/sessions \
  -H "Content-Type: application/json" \
  -d '{"task": "test", "projectId": "default"}'
# То же: POST http://localhost:3001/api/sessions … | Web dev: POST http://localhost:5173/api/a2a/sessions (AGENTS.md)
```

---

## 5. Устранение неполадок

### Проблема: Порт занят

```bash
# Найти и убить процесс на порту
# Windows:
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

### Проблема: Сервер не запускается

```bash
# Проверка логов
cd a2a-server
npm run dev  # смотреть ошибки в консоли
```

### Проблема: Нет соединения с LLM / hub unhealthy

```bash
curl http://localhost:11434/health
# Затем проверьте upstream из конфига (часто 11435):
curl http://localhost:11435/api/tags
```
Сверьте `LOCAL_LLM_UPSTREAM_URL` и провайдеры в ai-integration; репозиторий не стартует upstream за вас.

### Проблема: Сессии не сохраняются

```bash
# Проверка прав на папку storage
cd a2a-client
ls -la storage/

# Должна быть writable
```

---

## 6. Архитектура (Stateless)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Web UI    │────▶│ Client API   │────▶│ a2a-server  │────▶│ AI Hub (:11434) → upstream (env) │
│    :5173    │     │5173 or :3001 │     │    :3000    │     │ типично :11435 если локально   │
└─────────────┘     └──────┬───────┘     └─────────────┘     └─────────────────┘
                           │
                           │ JSON files
                           ▼
                    ┌───────────────┐
                    │   storage/    │
                    │  (sessions)   │
                    └───────────────┘
```

**Ключевое отличие:**
- Раньше: Server → PostgreSQL + Redis
- Теперь: Server → ничего (stateless), Client API → JSON files

---

## 7. Что изменилось

### Удалено:
- PostgreSQL (база данных)
- Redis (очереди)
- RabbitMQ (брокер)
- Prisma ORM
- Миграции базы данных
- Сложные health checks

### Упрощено:
- Запуск: не нужен docker-compose для базы
- Конфигурация: нет DATABASE_URL
- Тестирование: не нужна тестовая БД
- Резервное копирование: только JSON файлы

---

**Последнее обновление:** 2026-04-07 (stateless + треугольник: gate на :11434, upstream вне start-all)
