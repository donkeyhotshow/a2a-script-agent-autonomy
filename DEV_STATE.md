# DEV_STATE - Общее состояние проекта (2026-03-27)

> Текущее состояние системы для работы до продакшена.

---

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

### 1. A2A Server - STATELESS

Сервер **не хранит сессии** - только обрабатывает запросы:
- Контекст сессии передаётся в каждом запросе
- Session storage перенесён в Client API

### 2. Keyword-Based Routing

Маршрутизация использует статический keyword matching:
- Конфигурация: [`shared/router-static-choices.json`](shared/router-static-choices.json)
- Обработка: [`a2a-server/src/config/router-static.ts`](a2a-server/src/config/router-static.ts)

### 3. Action-Key Shape (ОБЯЗАТЕЛЬНО)

```json
// ✅ Правильно:
{ "execute": { "script": { ... } } }
{ "result": { "read-file": { "path": "...", "content": "..." } } }

// ❌ Неправильно:
{ "execute": { "action": "read-file", "file": "..." } }
{ "result": { "content": "..." } }
```

---

## Архитектура системы

```
┌──────────────────┐     ┌────────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web UI :5173   │────▶│ Client API     │────▶│ A2A Server  │────▶│ AI Hub      │
│   (Vite + API)   │     │ :5173/api/a2a  │     │ :3000       │     │ :11434      │
└──────────────────┘     └───────┬────────┘     └──────┬──────┘     └──────┬──────┘
                                 │                    │                   │
                                 ▼                    │                   ▼
                        ┌───────────────┐            │             ┌─────────────┐
                        │   storage/    │            │             │   Ollama    │
                        │  (sessions)   │            │             │   :11435    │
                        └───────────────┘            │             └─────────────┘
                                                   │
                                              (stateless)
```

---

## Ports

| Порт | Компонент | Описание |
|------|-----------|----------|
| 11435 | Ollama | Локальная LLM |
| 11434 | AI Integration | Прокси / promise → Ollama |
| 3000 | a2a-server | A2A API сервер (stateless) |
| 5173 | Vite Dev | Web UI + Client API |

---

## Переменные окружения

```bash
# Development
SKIP_AUTH=1
ENCRYPTION_KEY=12345678901234567890123456789012
JWT_SECRET=12345678901234567890123456789012
DEFAULT_SYNC_MODE=1
```

---

## Быстрый старт

### Windows

```bash
# Запуск всех компонентов
start-all.bat

# Проверка
curl http://localhost:3000/health
curl http://localhost:5173/api/a2a/projects
```

### Docker (AI Integration)

```bash
cd ai-integration
docker-compose up -d
```

---

## Подсистемы

| Подсистема | Описание | Файл состояния |
|------------|----------|-----------------|
| **a2a-client** | Web UI, Client API, Session Storage | [`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md) |
| **a2a-server** | Request Processing, Router, Transform | [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md) |
| **ai-integration** | AI Proxy, Ollama, Promises, Daemon | [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md) |

---

## Проверка работоспособности

```bash
# Server (stateless)
curl http://localhost:3000/health
# {"status":"ok","mode":"stateless"}

# AI Integration
curl http://localhost:11434/health

# Ollama
curl http://localhost:11435/api/tags

# Client API (Vite proxy)
curl http://localhost:5173/api/a2a/projects
```

---

## Тестирование

### Simulations (from repo root)

```bash
# Lint
npm run sim:lint -- --all --json

# Validate
npm run sim:validate -- --all --json
```

### Unit tests

```bash
# a2a-server
cd a2a-server && npm run test

# a2a-client
cd a2a-client && npm test
```

---

## Ссылки

- [AGENTS.md](AGENTS.md) - Правила работы агентов
- [docs/new-request-flow/PROTOCOL.md](docs/new-request-flow/PROTOCOL.md) - Протокол
- [a2a-server/docs/production/FULL_LAUNCH_PLAN.md](a2a-server/docs/production/FULL_LAUNCH_PLAN.md) - Полный план запуска
- [simulations/SCHEMA.md](simulations/SCHEMA.md) - Симуляции

---

## Известные проблемы

### Promise Polling не завершается

**Симптомы:**
- Promise остается в статусе "pending" в `server-promise.json`
- A2A Server уже вернул результат, но Client API не видит завершения

**Файлы для проверки:**
- [`a2a-client/vite-plugin-a2a/routes/stepRoutes.js`](a2a-client/vite-plugin-a2a/routes/stepRoutes.js) - логика polling

---

*Обновлено: 2026-03-27*