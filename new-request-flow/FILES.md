# Карта файлов проекта

## Обзор

Этот документ показывает структуру проекта и где какой код находится.

## Основные директории

```
c:/workspace/org-carrier/a2a-script-agent/
├── a2a-client/           # Клиентская часть
│   ├── packages/        # npm пакеты (agent, api-client, fs-utils, rag, etc.)
│   └── web/            # Web UI (порт 5173)
├── a2a-server/          # Серверная часть (порт 3000)
├── external-ai-hub/    # Прокси для Ollama (порт 11434)
└── new-request-flow/    # Документация и планы
```

---

## A2A Client

### a2a-client/web/

Web интерфейс (UI). Работает на порту 5173 (Vite dev server).

| Файл | Описание |
|------|----------|
| `index.html` | Главная HTML страница |
| `js/app-boot.js` | Инициализация приложения |
| `js/app-init.js` | Настройка приложения |
| `js/app-state.js` | Управление состоянием |
| `js/sessions.js` | Управление сессиями в UI |
| `js/actions-manager.js` | Менеджер действий |
| `js/sse-client.js` | SSE клиент для real-time обновлений |
| `js/web-api-client.js` | API клиент для связи с Client API |
| `js/flow/` | Flow-based UI компоненты |
| `js/json/` | JSON UI компоненты |
| `css/` | Стили |

### a2a-client/packages/

NPM пакеты внутри monorepo:

| Пакет | Путь | Описание |
|-------|------|----------|
| `api-client` | `packages/api-client/` | HTTP клиент для Server API |
| `agent` | `packages/agent/` | Агент |
| `fs-utils` | `packages/fs-utils/` | Файловые утилиты |
| `rag` | `packages/rag/` | RAG функциональность |
| `script-runner` | `packages/script-runner/` | Запуск скриптов |
| `terminal` | `packages/terminal/` | Терминал |
| `types` | `packages/types/` | Общие типы |

---

## A2A Server

Сервер (Stateless). Работает на порту 3000.

| Файл/Директория | Описание |
|-----------------|----------|
| `src/index.ts` | Точка входа |
| `src/server.ts` | Основной сервер |
| `src/routes/` | API маршруты |
| `src/services/` | Бизнес-логика |
| `src/agents/` | Агенты |
| `tests/` | Тесты |

---

## External AI Hub

Прокси-сервис для Ollama с поддержкой promiseId. Работает на порту 11434.

### Структура

```
external-ai-hub/
├── proxy/                      # Flask приложение
│   ├── __init__.py            # Flask app
│   ├── __main__.py            # Точка входа
│   ├── config.py              # Конфигурация
│   ├── routes.py              # API маршруты
│   ├── proxy_handler.py       # Обработка запросов
│   ├── ollama_manager.py      # Управление Ollama
│   ├── promises.py            # Promise система
│   ├── ai_hub_config.py      # AI Hub конфиг
│   └── views.py               # Дополнительные view
│
├── simulation/                 # ML симуляция
│   ├── config.py              # Конфигурация
│   ├── storage.py             # Хранение данных
│   ├── learner.py             # Обучение эмбеддингов
│   ├── engine.py              # Движок симуляции
│   └── prompt_manager.py      # Управление промптами
│
├── scripts/                    # Утилиты
│   ├── train.py               # Обучение
│   └── benchmark.py           # Бенчмарки
│
├── docs/                       # Документация
│   └── promise-viewer-plan.md # План UI для promise viewer
│
└── plans/                      # Планы разработки
    └── promise-queue-plan.md   # План очереди promise
```

### Ключевые endpoints

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/health` | GET | Проверка здоровья |
| `/api/tags` | GET | Список моделей |
| `/api/chat` | POST | Чат с LLM |
| `/api/generate` | POST | Генерация текста |
| `/promise/<id>` | GET | Статус promise |
| `/promise/<id>/response` | GET | Результат promise |
| `/ollama/status` | GET | Статус Ollama |
| `/ollama/start` | POST | Запустить Ollama |
| `/ollama/stop` | POST | Остановить Ollama |

### Promise Flow

```
1. Client → Proxy: POST /api/chat { model, messages } + X-Promise: true
2. Proxy → Client: { promiseId: "abc123", status: "pending" } (202)
3. Client → Proxy: GET /promise/abc123
4. Proxy → Client: { promiseId: "abc123", status: "pending" }
   (повторять пока не done)
5. Client → Proxy: GET /promise/abc123/response
6. Proxy → Client: { response from Ollama }
```

---

## New Request Flow (Документация)

Директория `new-request-flow/` содержит документацию и планы.

### Основные файлы

| Файл | Описание |
|------|----------|
| `README.md` | Общее описание системы |
| `ARCHITECTURE.md` | Архитектура системы |
| `PROTOCOL.md` | Протокол взаимодействия |
| `SESSION-FLOW.md` | Поток сессий |
| `CURRENT-ISSUES.md` | Текущие проблемы и план |
| `SIMULATION-ANALYSIS.md` | Анализ симуляций |
| `SIMULATION-FIX-VUE-IMPORTS.md` | Симуляция без AI |
| `SIMULATION-CODER-DIALOG.md` | Симуляция с RAG + запись файлов |
| `FILES.md` | Этот файл — карта проекта |

### Симуляции

Канон: **simulations/SCHEMA.md**.

```
simulations/
├── dialog/                    # Діалог з LLM
├── coder-dialog/              # Діалог + RAG + read/write файлів
├── coder-smart/               # Контекст-документ (MD)
├── fix-vue-imports/           # Виправлення Vue імпортів
├── fix-vue-imports-batched/
├── analyze-architecture/
├── phpunit-deprecations/
└── ...
```

---

## Порты

| Компонент | Порт | Описание |
|-----------|------|----------|
| Server | 3000 | A2A Server HTTP API |
| Client API | 3001 | HTTP API для web |
| Web UI | 5173 | Vite dev server |
| External AI Hub | 11434 | Прокси для Ollama |
| Ollama | 11435 | Локальная LLM |

---

## Переменные окружения

### Server (.env)

```
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENCRYPTION_KEY=32-characters-key-here
SKIP_AUTH=1
```

### External AI Hub

```
PROXY_PORT=11434
OLLAMA_HOST=http://localhost:11435
SIMULATION_ENABLED=false
OLLAMA_AUTO_START=true
OLLAMA_IDLE_TIMEOUT=300
```

---

## Следующие шаги

1. **Интеграция External AI Hub в Server**: Server должен отправлять запросы к Hub с X-Promise: true
2. **Polling логика**: Добавить периодический опрос promise статуса
3. **Обработка результатов**: Когда promise done, использовать результат для следующих действий
4. **UI обновления**: Показывать статус "AI обрабатывает..." пока promise pending
