# DEV_STATE - a2a-server (2026-03-27)

> Серверная часть: Request Processing, Router, Transform (STATELESS)

---

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

### A2A Server ТЕПЕРЬ STATELESS

**Убрано:**
- ❌ Хранение сессий на сервере
- ❌ Компонент `neurons`
- ❌ Сложная система состояний

**Добавлено:**
- ✅ Stateless обработка запросов
- ✅ Контекст передаётся в каждом запросе
- ✅ Keyword-based routing (вместо LLM)

---

## Подсистемы проекта

Подсистемы проекта описаны в общем [`DEV_STATE.md`](../DEV_STATE.md).

### Общая архитектура системы
Общая архитектура системы описана в [`DEV_STATE.md`](../DEV_STATE.md).

---

## Архитектура

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│ a2a-server  │────▶│   Proxy     │────▶│   Ollama    │
│  (HTTP/WS)  │     │  :3000     │     │  :11434    │     │   :11435    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                            │
                            │ (STATELESS - no session storage)
                            ▼
                     ┌─────────────┐
                     │  Transform  │
                     │   Pipeline   │
                     └─────────────┘
```

---

## API Endpoints

| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | `/health` | Liveness probe |
| GET | `/api/v1/health` | Detailed health |
| POST | `/api/v1/invoke` | **Главный endpoint** - обработка запросов |
| GET | `/api/v1/requests/:promiseId` | Статус запроса |
| GET | `/api/v1/requests/:promiseId/result` | Результат запроса |
| GET/POST/PUT/DELETE | `/api/v1/storage/:namespace/:key` | Storage API |
| DELETE | `/api/v1/storage/:namespace` | Очистка namespace |
| GET | `/api/v1/storage/:namespace/keys` | Список ключей |
| GET | `/metrics` | Prometheus метрики |

**ВАЖНО**: Используйте `/api/v1/invoke`, а не `/invoke`!

---

## Request Processing (Новый формат)

### Request Processors

Система использует специализированные процессоры для разных типов запросов:

| Процессор | Назначение | Файл |
|-----------|------------|------|
| **dialog-request-processor** | LLM диалог с пользователем | [dialog-request-processor.ts](src/services/core/request-processor/dialog-request-processor.ts) |
| **action-request-processor** | Agent действия (код, файлы, команды) | [action-request-processor.ts](src/services/core/request-processor/action-request-processor.ts) |
| **form-request-processor** | Формы, выборы, ввод данных | [form-request-processor.ts](src/services/core/request-processor/form-request-processor.ts) |
| **simulation-request-processor** | Golden тестирование | [simulation-request-processor.ts](src/services/core/request-processor/simulation-request-processor.ts) |

### Invoke Flow

```
POST /api/v1/invoke
    │
    ▼
invoke.service.ts
    │
    ▼
requestService.create() → promiseId
    │
    ▼
request-processor.service.ts (router)
    │
    ├──▶ dialog-request-processor (LLM)
    ├──▶ action-request-processor (tools)
    ├──▶ form-request-processor (forms)
    └──▶ simulation-request-processor (tests)
```

---

## Router (Keyword-Based)

### Конфигурация

| Файл | Назначение |
|------|------------|
| [src/config/router-static.ts](src/config/router-static.ts) | Обработка маршрутизации |
| [../../shared/router-static-choices.json](../../shared/router-static-choices.json) | Статические варианты выбора |

### Режимы работы

| ID | Label | Description |
|----|-------|-------------|
| `dialog` | AI діалог з користувачем | Вільний текстовий діалог з моделлю |
| `agent` | Agent (універсальний режим) | Агент з інструментами |
| `task-decomposition` | Декомпозиція задачі | Розбиття задачі на підзадачі |
| `fix-vue-imports` | Виправлення Vue imports | Скриптований сценарій |
| `fix-laravel-namespaces-and-uses` | Laravel: namespace та use | PHP namespace скрипт |

---

## Transform Pipeline

Система трансформации запросов и ответов:

| Файл | Назначение |
|------|------------|
| [transform/pipeline.ts](src/transform/pipeline.ts) | Главный pipeline |
| [transform/operations.ts](src/transform/operations.ts) | Операции трансформации |
| [transform/materialize-result-for-llm.ts](src/transform/materialize-result-for-llm.ts) | Подготовка результата для LLM |

### Server Transform файлы

Для каждого шага создаются:
- `server-transforms-request.json` - трансформация запроса
- `server-transforms-response.json` - трансформация ответа

---

## Контекст (Новые поля)

### Обязательные поля

| Поле | Тип | Описание |
|------|-----|----------|
| `version` | string | Версия протокола |
| `session_id` | string | ID сессии (обязательно) |

### Новые поля (New Protocol)

| Поле | Тип | Описание |
|------|-----|----------|
| `execution` | object | { action, step, progress, status } |
| `history` | array | История выполнения действий |
| `workbench` | object | Рабочее состояние: sections, batch, slots |

---

## Action-Key Shape (ОБЯЗАТЕЛЬНО)

### Execute формат

```json
{
  "execute": {
    "script": { "input": {...}, "output": "...", "code": "..." },
    "read-file": { "path": "..." },
    "write-file": { "path": "...", "content": "..." },
    "rag-search": { "query": "..." },
    "execute-command": { "command": "..." },
    "form": { "input": [...], "title": "...", "choices": [...] }
  }
}
```

### Result формат

```json
{
  "result": {
    "script": { "output": "..." },
    "read-file": { "path": "...", "content": "..." },
    "write-file": { "path": "...", "success": true },
    "rag-search": { "results": [...], "files": [...] },
    "message": "...",
    "choice": "..."
  }
}
```

---

## AI Integration

| Параметр | Значение |
|----------|----------|
| AI_HUB_URL | http://localhost:11434 |
| OLLAMA_MODEL | qwen3:8b |
| LLM_PROVIDER | ollama |

### Потоки данных

**Синхронный запрос (DEFAULT_SYNC_MODE=1):**
```
Client → POST /api/v1/invoke → a2a-server → response (sync: true)
```

**Асинхронный запрос:**
```
Client → POST /api/v1/invoke → a2a-server → promiseId
                                              │
                                              ▼
                              AI Hub Proxy + Daemon
                                              │
                                              ▼
Client ← GET /requests/:promiseId/result ← a2a-server
```

---

## Конфигурация

| Переменная | Описание | Значение |
|------------|----------|----------|
| LLM_PROVIDER | Провайдер LLM | ollama |
| AI_HUB_URL | URL прокси | http://localhost:11434 |
| OLLAMA_MODEL | Модель Ollama | qwen3:8b |
| SKIP_AUTH | Пропустить авторизацию | 1 |
| DEFAULT_SYNC_MODE | Синхронный режим | 1 |
| RATE_LIMIT_WINDOW_MS | Окно rate limiting (мс) | 60000 |
| RATE_LIMIT_MAX_REQUESTS | Макс. запросов в окне | 200 |
| LOG_LEVEL | Уровень логирования | info |
| LOG_FORMAT | Формат логов | json |

---

## Тестирование

```bash
# Тест 1: Проверка a2a-server
curl -s http://localhost:3000/health
# Результат: {"status":"ok","mode":"stateless","version":"..."}

# Тест 2: Invoke (sync)
curl -s -X POST http://localhost:3000/api/v1/invoke -H "Content-Type: application/json" \
  -d '{"task":"Привет","sync":true}'
# Результат: {"success":true,"data":{"sync":true,"execute":{...}}}

# Тест 3: Invoke (async)
curl -s -X POST http://localhost:3000/api/v1/invoke -H "Content-Type: application/json" \
  -d '{"task":"Проанализируй код"}'
# Результат: {"success":true,"data":{"promiseId":"prom_...","status":"pending"}}
```

---

## Что было убрано

| Компонент | Причина | Альтернатива |
|-----------|---------|--------------|
| Neurons | Устарел, сложная архитектура | action-request-processor |
| LLM Router Transform | Медленный, дорогой | keyword-based routing |
| Server session storage | Масштабируемость | Client API storage |

---

## Ссылки

- [Спецификация протокола](../docs/new-request-flow/PROTOCOL.md)
- [Архитектура](../docs/new-request-flow/ARCHITECTURE.md)
- [AGENTS.md](../AGENTS.md)

---

*Обновлено: 2026-03-27*
