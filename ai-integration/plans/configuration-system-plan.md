# План: Сертифицированная система конфигурации

> **Статус:** Частично выполнено ⚠️
> - ✅ Базовая загрузка конфигурации (`ai_hub_config.py`)
> - ✅ Компиляция правил с regex
> - ✅ JSON Schema валидация при загрузке
> - ✅ Валидация параметров LLM (limits в config.py)
> - ❌ API endpoints (/config, /config/validate)
> - ❌ Rate limiting middleware

## Цель

Создать надёжную систему конфигурации с многоуровневой валидацией — от приложения до запросов к LLM.

---

## Уровень 1: Конфигурация приложения (App-Level)

### 1.1 JSON Schema Валидация

- **Описание**: Валидация всего конфига при загрузке через JSON Schema
- **Компоненты**:
    - Расширенная схема `ai-hub.config.schema.json`
    - Валидация при запуске
    - Логирование ошибок валидации
- **Поля**:
    - `version` — версия конфига
    - `metadata` — метаинформация (author, created, description)
    - `settings` — общие настройки

### 1.2 Версионирование

- **Описание**: Поддержка версий конфига для совместимости
- **Компоненты**:
    - `config_version` — семантическая версия
    - `min_supported_version` — минимальная поддерживаемая
    - Миграции между версиями

### 1.3 Логирование и аудит

- **Описание**: Логирование всех изменений конфигурации
- **Компоненты**:
    - Лог загрузки конфига
    - Лог изменений параметров
    - Аудит (кто, когда, что изменил)

### 1.4 Timeout, Retry, Health Check

- **Описание**: Настройки для устойчивой работы
- **Переменные окружения**:

```
python
  APP_TIMEOUT = 120              # общий таймаут
  APP_RETRY_MAX = 3             # макс. попыток
  APP_RETRY_DELAY = 1           # задержка между попытками (сек)
  APP_HEALTH_CHECK_INTERVAL = 30 # интервал health check (сек)
  
```

---

## Уровень 2: Конфигурация LLM (LLM-Level)

### 2.1 Валидация параметров LLM

- **Описание**: Проверка допустимости параметров генерации
- **Параметры**:
    - `temperature` — диапазон [0, 2]
    - `top_p` — диапазон [0, 1]
    - `top_k` — диапазон [0, 100+]
    - `max_tokens` — макс. значение
    - `repeat_penalty` — диапазон [0, 2]
    - `seed` — целое число или null

### 2.2 Ограничения (Limits)

- **Описание**: Установка жёстких лимитов
- **Компоненты**:

```
python
  LLM_LIMITS = {
      'temperature': {'min': 0, 'max': 2, 'default': 0.7},
      'top_p': {'min': 0, 'max': 1, 'default': 0.9},
      'top_k': {'min': 0, 'max': 100, 'default': 40},
      'max_tokens': {'min': 1, 'max': 4096, 'default': 512},
      'repeat_penalty': {'min': 0, 'max': 2, 'default': 1.1},
      'num_ctx': {'min': 128, 'max': 32768, 'default': 4096},
      'num_predict': {'min': -1, 'max': 8192, 'default': 512},
  }
  
```

### 2.3 Defaults и Fallback

- **Описание**: Значения по умолчанию и запасные варианты
- **Компоненты**:
    - `default_model` — модель по умолчанию
    - `fallback_model` — запасная модель
    - `fallback_provider` — запасной провайдер

### 2.4 Request/Response Schema

- **Описание**: Валидация структуры запросов и ответов
- **Request schema**:
    - Обязательные поля: `model`, `prompt` или `messages`
    - Типы данных
    - Максимальная длина
- **Response schema**:
    - Ожидаемые поля
    - Типы данных в ответе

---

## Уровень 3: Правила (Rules-Level)

### 3.1 Валидация структуры правил

- **Описание**: Проверка корректности каждого правила
- **Компоненты**:
    - Проверка `id` — уникальность
    - Проверка `when` — условия
    - Проверка `then` — действия

### 3.2 Проверка Regex паттернов

- **Описание**: Валидация регулярных выражений при загрузке
- **Компоненты**:
    - Компиляция `path_regex` при загрузке
    - Компиляция `prompt_regex` при загрузки
    - Кэширование скомпилированных regex

### 3.3 Circular Dependency Detection

- **Описание**: Обнаружение циклических зависимостей в правилах
- **Компоненты**:
    - Построение графа зависимостей
    - DFS для обнаружения циклов
    - Предупреждение при обнаружении

---

## Уровень 4: Запросы (Request-Level)

### 4.1 Валидация JSON тела запроса

- **Описание**: Проверка структуры входящих запросов
- **Компоненты**:
    - Проверка Content-Type
    - Парсинг JSON
    - Schema для `/api/generate`
    - Schema для `/api/chat`

### 4.2 Required Fields

- **Описание**: Проверка обязательных полей
- **Для /api/generate**:
    - `model` (string, required)
    - `prompt` (string, required)
- **Для /api/chat**:
    - `model` (string, required)
    - `messages` (array, required)

### 4.3 Type Checking

- **Описание**: Проверка типов данных
- **Компоненты**:
    - `model` — string
    - `prompt` — string
    - `messages` — array of objects
    - `stream` — boolean

### 4.4 Rate Limiting

- **Описание**: Ограничение частоты запросов
- **Компоненты**:

```
python
  RATE_LIMIT = {
      'requests_per_minute': 60,
      'requests_per_hour': 1000,
      'tokens_per_minute': 10000,
  }
  
```

- IP-based limiting
- API key based limiting (опционально)

---

## Уровень 5: API для конфигурации

### 5.1 GET /config

- **Описание**: Получить текущую конфигурацию
- **Response**: Текущий конфиг (без secrets)

### 5.2 POST /config/validate

- **Описание**: Валидировать конфиг
- **Body**:

```
json
  {
    "config": { ... }
  }
  
```

- **Response**:

```
json
  {
    "valid": true,
    "errors": []
  }
  
```

### 5.3 GET /config/schema

- **Описание**: Получить JSON Schema
- **Response**: Полная схема конфига

### 5.4 GET /config/limits

- **Описание**: Получить лимиты параметров LLM
- **Response**:

```
json
  {
    "temperature": {"min": 0, "max": 2, "default": 0.7},
    "top_p": {"min": 0, "max": 1, "default": 0.9},
    ...
  }
  
```

### 5.5 GET /config/health

- **Описание**: Health check конфигурации
- **Response**:

```
json
  {
    "status": "healthy",
    "config_loaded": true,
    "validation_errors": [],
    "last_validation": "2024-01-01T00:00:00Z"
  }
  
```

---

## Расширенная JSON Schema

```
json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "author": {"type": "string"},
        "created": {"type": "string", "format": "date-time"},
        "description": {"type": "string"}
      }
    },
    "settings": {
      "type": "object",
      "properties": {
        "timeout": {"type": "integer", "minimum": 10, "maximum": 300},
        "retry_max": {"type": "integer", "minimum": 0, "maximum": 10},
        "retry_delay": {"type": "integer", "minimum": 0},
        "health_check_interval": {"type": "integer", "minimum": 10}
      }
    },
    "llm_limits": {
      "type": "object",
      "properties": {
        "temperature": {"type": "object", "properties": {"min": {"type": "number"}, "max": {"type": "number"}, "default": {"type": "number"}}},
        "top_p": {"type": "object", "properties": {"min": {"type": "number"}, "max": {"type": "number"}, "default": {"type": "number"}}},
        "max_tokens": {"type": "object", "properties": {"min": {"type": "integer"}, "max": {"type": "integer"}, "default": {"type": "integer"}}}
      }
    },
    "rate_limit": {
      "type": "object",
      "properties": {
        "requests_per_minute": {"type": "integer"},
        "requests_per_hour": {"type": "integer"},
        "tokens_per_minute": {"type": "integer"}
      }
    },
    "model_aliases": {"type": "object"},
    "rules": {"type": "array"},
    "virtual_models": {"type": "object"}
  }
}
```

---

## Файлы для изменения/создания

### Новые файлы:

1. `ai-integration/config/validator.py` — модуль валидации
2. `ai-integration/config/limits.py` — лимиты параметров
3. `ai-integration/config/rate_limiter.py` — rate limiting
4. `ai-integration/docs/ai-hub.config.schema.v2.json` — расширенная схема

### Изменяемые файлы:

1. `ai-integration/proxy.py` — интеграция валидации
2. `ai-integration/docs/ai-hub.config.schema.json` — обновление схемы

---

## Приоритеты реализации

| Приоритет | Задача             | Описание                     |
|-----------|--------------------|------------------------------|
| 1         | App-Level Config   | Базовые настройки приложения |
| 2         | LLM Limits         | Валидация параметров LLM     |
| 3         | Rules Validation   | Валидация правил             |
| 4         | Request Validation | Валидация запросов           |
| 5         | Rate Limiting      | Ограничение частоты          |
| 6         | Config API         | API для конфигурации         |

---

## Пример конфига с сертификацией

```
json
{
  "version": "1.0.0",
  "metadata": {
    "author": "admin",
    "created": "2024-01-01T00:00:00Z",
    "description": "Production configuration"
  },
  "settings": {
    "timeout": 120,
    "retry_max": 3,
    "retry_delay": 1,
    "health_check_interval": 30
  },
  "llm_limits": {
    "temperature": {"min": 0, "max": 2, "default": 0.7},
    "top_p": {"min": 0, "max": 1, "default": 0.9},
    "top_k": {"min": 0, "max": 100, "default": 40},
    "max_tokens": {"min": 1, "max": 4096, "default": 512},
    "repeat_penalty": {"min": 0, "max": 2, "default": 1.1},
    "num_ctx": {"min": 128, "max": 32768, "default": 4096}
  },
  "rate_limit": {
    "requests_per_minute": 60,
    "requests_per_hour": 1000,
    "tokens_per_minute": 10000
  },
  "model_aliases": {
    "qwen3:8b": "qwen3:8b",
    "small": "qwen3:8b"
  },
  "rules": [
    {
      "id": "validate_params",
      "enabled": true,
      "when": {
        "path_regex": "^api/(generate|chat).*$"
      },
      "then": {
        "type": "validate_request"
      }
    }
  ]
}
