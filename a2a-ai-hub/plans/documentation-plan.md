# План: Документация a2a-ai-hub

> **Статус:** В работе 🔄

## Цель

Задокументировать архитектуру, REST-потоки и ключевые модули a2a-ai-hub.

## Задачи из TODO.md

### 1. Конфигурация (срок: 07.03.2026)

- [ ] Зафиксировать выводы по `.env.example` и `config/providers.json`
- [ ] Связать с планом изучения конфигураций
- [ ] Обновить документацию по основным параметрам
- [ ] Определить следующий шаг по `config/`

### 2. Прокси-маршруты и Promise Workflow (срок: 08.03.2026)

- [ ] Сформулировать вопросы по прокси-маршрутам
- [ ] Описать promise workflow (routes/handler/promises)
- [ ] Полно описать потребности UI
- [ ] Задать приоритетные уточнения

### 3. Архитектура simulation/ и scripts/ (срок: 08.03.2026)

- [ ] Документировать `simulation/engine.py`
- [ ] Документировать `simulation/learner.py`
- [ ] Документировать `simulation/learning_queue.py`
- [ ] Документировать `scripts/train.py`
- [ ] Документировать `scripts/promise_queue_daemon.py`
- [ ] Закрепить зависимости для UI decision-making

### 4. REST-поток Ticket Queue (срок: 09.03.2026)

- [ ] Задокументировать `/promises/pending`
- [ ] Задокументировать `/promise/<id>/...` эндпоинты
- [ ] Описать ключевые модули:
  - `proxy/routes.py`
  - `proxy/promises.py`
  - `proxy/proxy_handler.py`
  - `proxy/daemon.py`
  - `proxy/views.py`

### 5. Параметры провайдеров (срок: 10.03.2026)

- [ ] Уточнить параметры провайдеров
- [ ] По умолчанию `compat_llm`
- [ ] Fallback на `groq/openrouter`
- [ ] Timeout/retry настройки
- [ ] Требуемые API ключи
- [ ] Продумать UI-представление

### 6. Health и Metrics (срок: 11.03.2026)

- [ ] Проверить `/health*` эндпоинты
- [ ] Проверить `/metrics` эндпоинт
- [ ] Записать возвращаемые поля
- [ ] Записать возможные состояния
- [ ] Связать метрики с CI/CD сценариями

## API Endpoints для документирования

### Health
- `GET /health` - основной health check
- `GET /health/compat_llm` - проверка Local LLM upstream
- `GET /health/ready` - проверка готовности

### Metrics
- `GET /metrics` - метрики прокси

### Promise
- `GET /promise/<promiseId>` - статус promise
- `GET /promise/<promiseId>/response` - получить ответ
- `GET /promise/<promiseId>/request` - получить запрос
- `POST /promise/<promiseId>/answer` - отправить ответ
- `POST /promise/<promiseId>/execute` - выполнить
- `GET /promises/pending` - список pending promises

### Local LLM upstream
- `GET /compat_llm/status` - статус Local LLM upstream
- `POST /compat_llm/start` - запустить
- `POST /compat_llm/stop` - остановить
- `POST /compat_llm/restart` - перезапустить

### Daemon
- `GET /daemon/status` - статус daemon
- `POST /daemon/start` - запустить daemon

### Queue
- `GET /queue` - просмотр очереди

## Файлы для создания/обновления

- `docs/workflows/promise-workflow.md` - документация promise workflow
- `docs/workflows/rest-api.md` - REST API документация
- `docs/tasks/documentation.md` - план документации
- `docs/api-reference/full.md` - полная API документация
