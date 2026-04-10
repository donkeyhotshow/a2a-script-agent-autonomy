# План: Promise Queue и Approval System

> **Статус:** В основном выполнено ✅
> - ✅ PromiseRecord с хранением на диске (`promises.py`)
> - ✅ ThreadPoolExecutor для обработки
> - ✅ TTL для promises
> - ✅ Queue management (/queue, GET)
> - ✅ Auto-execution после approve (inline в proxy_handler.py)
> - ❌ Drag-and-drop приоритеты в UI

## Цель

Реализовать систему очереди для pending requests с фильтрацией логов и исполнением одобренных отправок.

## Текущее состояние

- ✅ Promise Viewer UI работает: http://localhost:11435/ui/promises/view
- ✅ API endpoints работают
- ❌ Порт 11435 занят (нужно использовать 11438 или освободить)

## Задачи

### 0. Управление Local LLM upstream (встроено в daemon прокси)

- ⏳ Local LLM upstream работает внутри daemon прокси (не внешний процесс)
- ⏳ Local LLM upstream стартует при потребности (первый запрос с LLM)
- ⏳ Local LLM upstream останавливается при ненадобности (после idle таймаута)
- ⏳ Внутренний порт для Local LLM upstream (не 11435, напр. 11434)
- ⏳ API endpoints:
    - `GET /compat_llm/status` - статус (running/stopped)
    - `POST /compat_llm/start` - запустить Local LLM upstream
    - `POST /compat_llm/stop` - остановить Local LLM upstream
    - `POST /compat_llm/restart` - перезапустить
- ⏳ Конфигурация:
    - `LOCAL_LLM_PORT` - внутренний порт (по умолчанию 11435)
    - `LOCAL_LLM_IDLE_TIMEOUT` - таймаут простоя (по умолчанию 300 сек)
    - `LOCAL_LLM_AUTO_START` - автозапуск (по умолчанию false)

### 1. Фильтр сохраняемого в лог (Log Filtering)

Какие данные сохранять в лог:

- ✅ method, path, headers, body (всегда)
- ⏳ Фильтр по: size, type, path regex
- ⏳ Сжатие больших тел
- ⏳ Уровни логирования (debug, info, warn)

### 2. Очередь (Queue)

- ✅ Текущее состояние: pending promises хранятся в памяти + на диске
- ⏳ Добавить порядок выполнения (FIFO, приоритеты)
- ⏳ API endpoints для управления очередью:
    - `GET /queue/status` - статус очереди
    - `POST /queue/<id>/retry` - повторить выполнение
    - `DELETE /queue/<id>` - удалить из очереди

### 3. Исполнение одобренных отправок (Approved Execution)

- ✅ Ручное выполнение через `/promise/<id>/execute`
- ⏳ Автоматическое выполнение после approve
- ⏳ Retry логика при ошибках

## Реализация

### Этап 0: Local LLM upstream встроена в daemon прокси (2-3 дня)

```
0.1. Внутренний класс Local LLM upstreamManager внутри proxy:
    - Flask route для /compat_llm/*
    - subprocess для compat_llm serve на LOCAL_LLM_PORT
    - idle timer для авто-остановки
0.2. Конфигурация LOCAL_LLM_PORT, LOCAL_LLM_IDLE_TIMEOUT
0.3. API endpoints внутри proxy:
    - GET /compat_llm/status
    - POST /compat_llm/start
    - POST /compat_llm/stop
0.4. Auto-start при первом LLM запросе
0.5. Auto-stop после idle таймаута
0.6. Проксирование /api/generate на LOCAL_LLM_PORT
```

### Этап 1: Log Filtering (1-2 дня)

```
1.1. Добавить конфигурацию log_level (debug|info|warn|error)
1.2. Фильтр по path_regex
1.3. Лимит размера body для сохранения
1.4. gzip сжатие для больших файлов
```

### Этап 2: Queue Management (2-3 дня)

```
2.1. Структура очереди в БД/файлах
2.2. API для управления очередью
2.3. Web UI для просмотра очереди
2.4. Drag-and-drop приоритеты
```

### Этап 3: Approved Execution (2-3 дня)

```
3.1. Автоматический execute после answer
3.2. Callback/веб-хуки
3.3. Retry с экспоненциальной задержкой
3.4. History и审计
```

## Файлы для изменения

- `proxy.py` - основная логика
- `web/promise-viewer.html` - UI для очереди
- Конфигурация в переменных окружения
