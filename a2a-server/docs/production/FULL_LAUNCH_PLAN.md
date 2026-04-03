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
- Ollama с установленными моделями

### 1.2 Требуемые порты
| Порт | Компонент | Описание |
|------|-----------|----------|
| 11435 | Ollama | Локальная LLM |
| 11434 | AI Integration | Прокси / promise → Ollama :11435 |
| 3000 | a2a-server | A2A API сервер (stateless) |
| 3001 | a2a-client (SDK) | Client API (опционально; Web чаще Vite 5173 + `/api/a2a/*`) |
| 5173 | Vite Dev | Web UI |

> **Примечание:** Порты 5432 (PostgreSQL), 6379 (Redis), 5672 (RabbitMQ) больше не используются.

---

## 2. Последовательность запуска

### ЭТАП 1: Запуск Ollama (единственная внешняя зависимость)

```bash
# Запуск Ollama
docker run -d -v ollama_data:/root/.ollama -p 11435:11435 --name ollama ollama/ollama:latest

# Установка модели (обязательно)
docker exec ollama ollama pull qwen3:8b

# Проверка
curl http://localhost:11435/api/tags
```

**Ожидаемый ответ:**
```json
{
  "models": [
    {
      "name": "qwen3:8b",
      "size": ...,
      "modified_at": "..."
    }
  ]
}
```

> ⚠️ **КРИТИЧНО:** Без модели дальнейший запуск невозможен!

### ЭТАП 2: Запуск AI Integration (опционально, для проксирования)

```bash
cd ai-integration
pip install -r requirements.txt
python -m proxy
```

### ЭТАП 3: Настройка переменных окружения

```bash
# Основные переменные (stateless - нет database/redis)
export OLLAMA_URL="http://localhost:11435"
export OLLAMA_MODEL="qwen3:8b"
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
# 1. Только Ollama нужен
docker run -d -v ollama_data:/root/.ollama -p 11435:11435 --name ollama ollama/ollama:latest
docker exec ollama ollama pull qwen3:8b

# 2. Запуск всех компонентов Node.js
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

# AI Integration (если запущен)
curl http://localhost:11434/health

# Ollama
curl http://localhost:11435/api/tags
# {"models": [...]}
```

### 4.2 Проверка потока

```bash
# Создание сессии (standalone SDK на 3001)
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"task": "test", "projectId": "default"}'
# Web dev: POST http://localhost:5173/api/a2a/sessions (см. AGENTS.md)
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

### Проблема: Нет соединения с Ollama

```bash
# Проверка Ollama
curl http://localhost:11435/api/tags
# Должен вернуть список моделей

# Если не работает - перезапуск
docker restart ollama
```

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
│   Web UI    │────▶│ Client API   │────▶│ a2a-server  │────▶│ AI Hub → Ollama │
│    :5173    │     │5173 or :3001 │     │    :3000    │     │ :11435 → :11434 │
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

**Последнее обновление:** 2026-03-07 (переход на stateless)
