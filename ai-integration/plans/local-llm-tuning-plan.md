# План: local LLM tuning и loop detection

> **Статус:** В основном выполнено ✅
> - ✅ LocalLlmManager с start/stop/restart (`local_llm_manager.py`)
> - ✅ Idle timeout для авто-остановки
> - ✅ Temperature=0 по умолчанию
> - ❌ Loop detection (n-gram analysis)

## Цель

Добавить захардкоженные параметры для стабильной работы LLM и обнаружения зацикливаний.

## Задачи

### 1. Hardcoded параметры LLM

- **temperature = 0** - детерминированный вывод
- **stream = true** - потоковый вывод
- **fallback chain**:
    1. Потоковый (stream=true)
    2. → Chat completion (fallback)
    3. → Non-stream (fallback)

### 2. Loop Detection (Обнаружение зацикливания)

- ⏳ Отслеживание повторяющихся паттернов в выводе
- ⏳ Trigram analysis - повторение 3+ слов более 3 раз
- ⏳ Portion repetition - >30% текста повторяется
- ⏳ Max tokens threshold - слишком длинный вывод без смысла
- ⏳ При обнаружении loop:
    - Сброс локального upstream (restart subprocess)
    - Пометка запроса как `invalid=true`
    - Логирование инцидента

### 3. API для управления

- `GET /llm/config` - текущая конфигурация
- `POST /llm/loop-detected/<promiseId>` - пометить как зацикленный
- `GET /llm/stats` - статистика loop detection

## Реализация

### Этап 1: Hardcoded параметры (1 день)

```
1.1. Изменить temperature=0 в proxy.py
1.2. Реализовать stream=true по умолчанию
1.3. Fallback chain: stream → chat → non-stream
```

### Этап 2: Loop Detection (2-3 дня)

```
2.1. Класс LoopDetector:
    - n-gram анализ (n=3)
    - порог повторения 30%
    - max_tokens_limit
2.2. Интеграция в streaming pipeline
2.3. Auto-restart локального upstream при детекции
2.4. Пометка promise как invalid
2.5. Логирование инцидентов
```

## Hardcoded значения

```python
LLM_DEFAULTS = {
    'temperature': 0,        # детерминированный вывод
    'top_p': 0.9,            # умеренная выборка
    'stream': True,          # потоковый вывод
    'repeat_penalty': 1.1,   # штраф за повторения
}

LOOP_DETECTION = {
    'ngram_size': 3,         # размер n-gram
    'repeat_threshold': 0.3, # 30% повторений = loop
    'max_loops': 3,          # макс. повторов n-gram
    'min_tokens': 50,       # мин. токенов для проверки
}
```

## Файлы для изменения

- `proxy.py` - LLM параметры и loop detection
- Новая директория: `loop_detect/` - модуль loop detection

## Что ещё нужно (дополнения):

- ⏳ **Timeout** - макс. время генерации (default: 120 сек)
- ⏳ **Model management** - выбор модели, очистка памяти
- ⏳ **Health check** - проверка доступности upstream
- ⏳ **Retry logic** - повтор при ошибках подключения
- ⏳ **Request queue** - очередь при занятости upstream
- ⏳ **Memory management** - очистка after each request
- ⏳ **Metrics** - время ответа, кол-во loop-ов, ошибок
- ⏳ **Config via env** - все параметры через переменные

### Дополнительные env переменные:

```python
LOCAL_LLM_TIMEOUT = 120          # timeout в секундах
LOCAL_LLM_MODEL = "qwen3:8b"       # модель по умолчанию
LOCAL_LLM_REQUEST_TIMEOUT = 60  # таймаут на запрос
LOCAL_LLM_QUEUE_SIZE = 10       # макс. очередь
LOCAL_LLM_MAX_RETRIES = 3       # кол-во попыток
```
