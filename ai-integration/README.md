# Ollama Proxy Service

**Live stack:** Start or restart the **whole** coordinated stack from the repo root: **`.\start-all.bat`** (Windows) or **`./start-all.sh`** (Linux/macOS). Do not treat this folder’s standalone run instructions as the way to restart the monorepo stack.

Прокси-сервис для перехвата и логирования запросов к Ollama с поддержкой ML-симуляции rnj-L.

## Возможности

- **Базовый прокси**: Перенаправляет запросы с порта 11434 на 11435
- **Логирование**: Сохраняет каждый запрос в отдельную папку с request.json и response.json
- **ML Симуляция**: Обучение на истории rnj-1 и симуляция ответов как rnj-L при высокой уверенности
- **Model Mapping**: Маппинг имен моделей + правила роутинга через `AI_HUB_CONFIG`
- **Async Promises**:异步模式 через `promiseId` + получение результата позже
- **Ollama Manager**: Автоматический старт/остановка Ollama

## Установка

### Вариант 1: Ручная установка

```bash
pip install -r requirements.txt
```

### Вариант 2: Docker (рекомендуется)

```bash
# Запуск с Docker Compose
./docker-run.sh start

# Или вручную
docker-compose up -d

# Проверка статуса
./docker-run.sh status
```

### Вариант 3: Разработка

```bash
# Установка с инструментами разработки
pip install -r requirements.txt
pip install pytest black isort mypy flake8

# Или через Docker в режиме разработки
./docker-run.sh dev
```

## Запуск

```
bash
# Запуск через модуль (рекомендуется)
python -m proxy

# Или через __main__
python -m proxy --port 11434 --ollama-host http://localhost:11435

# С включенной симуляцией
set SIMULATION_ENABLED=true
python -m proxy
```

## Конфигурация

Переменные окружения:

| Переменная              | По умолчанию           | Описание                        |
|-------------------------|------------------------|---------------------------------|
| PROXY_PORT              | 11434                  | Порт прокси                     |
| OLLAMA_HOST             | http://localhost:11435 | Хост реальной Ollama            |
| STORAGE_DIR             | proxy_logs             | Папка для логов                 |
| SIMULATION_ENABLED      | false                  | Включить ML симуляцию           |
| SIMULATION_DATA_PATH    | simulation_data        | Папка данных симуляции          |
| AI_HUB_CONFIG           | -                      | JSON-конфиг маппинга/симуляции  |
| FORWARD_TIMEOUT_SECONDS | 60                     | Таймаут проксирования           |
| OLLAMA_AUTO_START       | true                   | Автозапуск Ollama               |
| OLLAMA_IDLE_TIMEOUT     | 300                    | Секунд до остановки Idle Ollama |
| HEALTH_CHECK_INTERVAL   | 5                      | Интервал health check (сек)     |
| LOG_LEVEL               | INFO                   | Уровень логирования             |
| LOG_FORMAT              | json                   | Формат логов (json/text)        |

## Health Check Endpoints

### `/health` - Liveness Probe
Базовая проверка работоспособности прокси.

```json
{
  "status": "running",
  "proxy_port": 11434,
  "ollama_host": "http://localhost:11435",
  "ollama_available": true
}
```

### `/health/ollama` - Ollama Availability
Проверка доступности Ollama. Возвращает HTTP 503 если Ollama недоступна.

```json
{
  "status": "healthy",
  "ollama_available": true,
  "ollama_url": "http://localhost:11435",
  "ollama_pid": 12345,
  "idle_seconds": 120
}
```

### `/health/ready` - Readiness Probe
Проверка готовности прокси к обработке запросов. Возвращает HTTP 200 только если Ollama доступна.

```json
{
  "status": "ready",
  "ollama_available": true,
  "cache_status": "active"
}
```

## Metrics Endpoint

### `/metrics` - Prometheus Metrics
Возвращает метрики в формате Prometheus.

| Метрика | Тип | Описание |
|---------|-----|----------|
| `ai_proxy_requests_total` | counter | Общее количество запросов |
| `ai_proxy_request_duration_seconds` | histogram | Гистограмма времени обработки |
| `ai_proxy_errors_total` | counter | Общее количество ошибок |
| `ollama_model_loaded` | gauge | Загружена ли модель (1/0) |
| `ai_proxy_uptime_seconds` | gauge | Время работы (сек) |

## Graceful Shutdown

Прокси поддерживает graceful shutdown:
- Обработка SIGTERM/SIGINT сигналов
- Ожидание завершения активных запросов (до 30 сек)
- Корректная остановка Ollama (если запущена прокси)
- Логирование процесса shutdown

## Структура проекта

```
ai-integration/
├── proxy/                      # Модуль прокси
│   ├── __init__.py             # Flask app
│   ├── __main__.py             # Точка входа
│   ├── config.py               # Конфигурация
│   ├── routes.py               # Маршруты API
│   ├── proxy_handler.py        # Обработка запросов
│   ├── ollama_manager.py       # Управление Ollama
│   ├── promises.py            # Async promises
│   ├── ai_hub_config.py        # AI Hub конфиг
│   ├── views.py                # Дополнительные view
│   └── utils.py                # Утилиты
│
├── simulation/                 # ML симуляция
│   ├── config.py              # Конфигурация
│   ├── storage.py             # Хранение данных
│   ├── learner.py              # Обучение эмбеддингов
│   ├── engine.py               # Движок симуляции
│   ├── prompt_manager.py      # Управление промптами
│   └── learning_queue.py       # Очередь обучения
│
├── scripts/                    # Утилиты
│   ├── train.py               # Обучение индекса
│   ├── benchmark.py           # Бенчмарки
│   ├── migrate.py             # Миграция данных
│   └── learning_queue.py       # Управление очередью
│
├── docs/                       # Документация
│   ├── UPGRADE.md             # Апгрейд гайд
│   └── ai-hub.config.example.json
│
└── proxy_logs/                # Логи запросов
    └── request_*/
        ├── request.json
        └── response.json
```

## API Endpoints

### Базовые

- `GET /health` - Проверка здоровья
- `GET /api/tags` - Список моделей
- `POST /api/generate` - Генерация (streaming)
- `POST /api/chat` - Чат (streaming)

### Promises

- `POST /api/promises/create` - Создать promise
- `GET /api/promises/<id>/status` - Статус promise
- `GET /api/promises/<id>/result` - Получить результат

### Симуляция (когда SIMULATION_ENABLED=true)

- `GET /simulation/status` - Статус симуляции
- `POST /simulation/test` - Тест симуляции
- `POST /simulation/force-real` - Форсировать реальный Ollama

## Scripts

```
bash
# Обучение модели
python -m scripts.train build      # Построить индекс с нуля
python -m scripts.train update    # Обновить индекс
python -m scripts.train stats     # Показать статистику
python -m scripts.train test      # Тест модели

# Бенчмарки
python -m scripts.benchmark --all

# Миграция
python -m scripts.migrate --version

# Управление очередью обучения
python -m scripts.learning_queue list --status pending
python -m scripts.learning_queue stats
python -m scripts.learning_queue approve <id>
```

## Docker

### Быстрый старт

```bash
# Клонировать репозиторий
git clone <repository-url>
cd ai-integration

# Запустить сервисы
./docker-run.sh start

# Проверить статус
curl http://localhost:11434/health
```

### Команды Docker

```bash
# Сборка образов
./docker-run.sh build

# Запуск сервисов
./docker-run.sh start

# Остановка сервисов
./docker-run.sh stop

# Перезапуск
./docker-run.sh restart

# Просмотр логов
./docker-run.sh logs

# Статус сервисов
./docker-run.sh status

# Запуск тестов
./docker-run.sh test

# Очистка
./docker-run.sh clean

# Режим разработки (с горячей перезагрузкой)
./docker-run.sh dev
```

### Структура сервисов

- **ollama**: LLM сервер (порт 11435)
- **ai-integration**: Прокси с демоном (порт 11434)
- **ai-integration-dev**: Режим разработки (порт 11438)

### Переменные окружения

```bash
# Основные настройки
OLLAMA_HOST=http://ollama:11435
PROXY_PORT=11434

# Очистка
ENABLE_CLEANUP=true
PROMISE_RETENTION_DAYS=7
LOG_RETENTION_DAYS=30

# Логирование
LOG_LEVEL=INFO
```

## Testing scripts

- `python -m scripts.test_ai_integration` — runs proxy/ollama health checks, then verifies the promise daemon by reusing the promise-chain helper; add `--skip-promise` if the daemon is temporarily unavailable.
- `python -m scripts.tests.promise_chain` — focused promise-chain smoke test (creates a promise with `?promise=1` and waits for the daemon to intercept it) that can also be used inside CI workflows.
- `python -m scripts.tests.daemon_resilience` — validates daemon resilience across provider disconnect/reconnect (`/ollama/stop` -> health/daemon checks -> `/ollama/start`).
- `python scripts/test_promise_daemon.py` — standalone CLI that checks `/health`, sends `?promise=1`, waits for the daemon to complete it, and then retrieves `/promise/<id>/response`; accepts `--host`, `--port`, `--timeout`, `--path`, `--model`, and `--prompt`.
- `python -m scripts.test_ai_integration_chain` — single command that walks health → metrics → optional simulation probes → optional promise chain → optional proxy_logs inspection (use `--skip-*` / `--check-logs` as needed).

## Model normalization

All POST/PUT/PATCH payloads that include a `model` field are rewritten to `qwen3:8b` before being forwarded to Ollama. That override happens after alias resolution and simulation/routing rules — downstream components can still read the original `requested_model`, but every proxied call hits `qwen3:8b`.

## ML Симуляция

Система обучается на истории взаимодействий с rnj-1 и может симулировать ответы как rnj-L когда уверенность высока:

```
Уверенность >= 0.75 → rnj-L симуляция (быстро, <200ms)
Уверенность < 0.75  → Реальный rnj-1 (медленнее, точнее)
```

Для работы симуляции установите дополнительные зависижки:

```
bash
pip install sentence-transformers faiss-cpu numpy scikit-learn torch
```

## Документация

См. `docs/UPGRADE.md` и пример конфига `docs/ai-hub.config.example.json`.

## Project workflow & documentation links

- `[AGENTS.md](AGENTS.md)` — правила ведения итераций, структура Scratchpad/plan/TODO.
- `[DEV_STATE.md](DEV_STATE.md)` — живой журнал текущей работы: план, статус, заметки и важные файлы.
- `[TODO.md](TODO.md)` — актуальные задачи с владельцами и сроками.
- `[docs/ci-cd-proxy-scenarios.md](docs/ci-cd-proxy-scenarios.md)` — CI/CD-потоки, health/metrics и secrets для релизов.
- `[docs/promise-viewer-plan.md](docs/promise-viewer-plan.md)` — требования к UI promise viewer, включая provider panel.
- `[config/providers.json](config/providers.json)` — провайдеры, fallback, timeouts, ключи, которые UI/CI должны учитывать.
