# DEV_STATE - Общее состояние проекта

> Общая информация о состоянии системы и кросс-компонентные проблемы

## Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web UI (5173)                           │
│   a2a-client/web - User interface with session management       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Client API / Vite Plugin                     │
│   a2a-client - Serves API, manages sessions, stores data        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       A2A Server (3000)                         │
│   a2a-server - Processes requests, executes actions            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI Hub Proxy (11434)                        │
│   ai-integration - Routes to LLM providers                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Ollama (11435)                             │
│   Local LLM service (qwen3:8b, etc.)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Подсистемы

| Подсистема | Описание | Файл состояния |
|------------|----------|----------------|
| **a2a-client** | Web UI, Client API, Session Management | [`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md) |
| **a2a-server** | Request Processing, Neurons, Storage | [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md) |
| **ai-integration** | AI Proxy, Ollama, Promises | [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md) |
| **docs** | Project documentation | [`docs/DEV_STATE.md`](docs/DEV_STATE.md) |
| **scripts** | Development and testing scripts | [`scripts/DEV_STATE.md`](scripts/DEV_STATE.md) |
| **simulations** | Test simulations and scenarios | [`simulations/DEV_STATE.md`](simulations/DEV_STATE.md) |

---

## Актуальные проблемы (Кросс-компонентные)

### 1. Promise Polling не завершается (2026-03-20)

**Симптомы:**
- Promise остается в статусе "pending" в `server-promise.json`
- A2A Server уже вернул результат, но Client API не видит завершения

**Анализ:**
- Проверено через curl: A2A Server возвращает результат для promise
- Результат содержит `execute` с формой выбора (3 choices)
- Client API (stepRoutes.js) должен был опросить promise и сохранить результат

**Возможные причины:**
1. Polling на стороне Client API не довел до завершения
2. Формат ответа A2A Server не соответствует ожиданиям (поле status)
3. Сохранение messages.json не реализовано

**Файлы для проверки:**
- [`a2a-client/vite-plugin-a2a/routes/stepRoutes.js`](a2a-client/vite-plugin-a2a/routes/stepRoutes.js:230-265) - логика polling и сохранения
- [`a2a-client/web/js/session-store.js`](a2a-client/web/js/session-store.js:330-337) - pushMessage

---

## Выполненные задачи (Глобальные)

### Система управления сессиями (2026-03-12)

- [x] Реализован переключатель для смены места хранения сессий
- [x] Изменена структура хранения - пронумерованные папки (1/, 2/, 3/)
- [x] Реализовано создание сессии с автоматическим добавлением execute form input
- [x] Реализован прелоадер при ожидании ответа от a2a-server

### Исправленные баги (2026-03-12)

- [x] A2A Server endpoints: `/invoke` → `/api/v1/invoke`
- [x] Invoke service: исправлен приоритет result в `invoke.service.ts`
- [x] Promise routes: добавлена проверка статуса Ollama
- [x] Session storage: добавлено сохранение истории сообщений

---

## Технические детали

| Параметр | Значение |
|----------|----------|
| A2A Server | http://localhost:3000 |
| Client API | http://localhost:5173/api/a2a |
| Web UI | http://localhost:5173 |
| AI Hub Proxy | http://localhost:11434 |
| Ollama | http://localhost:11435 |
| Модель | qwen3:8b |

### Переменные окружения

| Переменная | Описание | Значение |
|------------|----------|----------|
| `SKIP_AUTH` | Пропустить авторизацию | 1 |
| `ENCRYPTION_KEY` | Ключ шифрования (32 символа) | 12345678901234567890123456789012 |
| `JWT_SECRET` | Секрет JWT (мин. 32 символа) | 12345678901234567890123456789012 |
| `DEFAULT_SYNC_MODE` | Синхронный режим | 1 |

---

## Ссылки на документацию

- [AGENTS.md](AGENTS.md) - Правила работы с агентами и протокол A2A
- [GLOSSARY.md](GLOSSARY.md) - Терминология проекта
- [README.md](README.md) - Основная документация

---

*Обновлено: 2026-03-24*
