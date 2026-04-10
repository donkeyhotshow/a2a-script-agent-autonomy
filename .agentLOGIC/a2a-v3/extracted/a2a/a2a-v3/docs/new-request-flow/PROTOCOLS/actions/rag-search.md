# Протокол действия: rag-search

## Описание

Действие `rag-search` используется для поиска релевантной информации в векторной базе знаний проекта с использованием RAG (Retrieval-Augmented Generation).

## Направление

```
Server → Client API → RAG Service (execute)
RAG Service → Client API → Server (result)
```

## Формат execute

### Server → Client API

```json
{
  "execute": {
    "rag-search": {
      "query": "функция аутентификации пользователя",
      "limit": 5,
      "threshold": 0.7,
      "filters": {
        "type": "typescript"
      }
    }
  }
}
```

### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `query` | string | ✅ | Поисковый запрос |
| `limit` | number | ❌ | Максимальное количество результатов (по умолчанию: 5) |
| `threshold` | number | ❌ | Минимальный порог релевантности (по умолчанию: 0.5) |
| `filters` | object | ❌ | Дополнительные фильтры |
| `indexName` | string | ❌ | Имя индекса для поиска |

## Формат result

### Client API → Server

```json
{
  "result": {
    "rag-search": {
      "query": "функция аутентификации пользователя",
      "results": [
        {
          "file": "src/auth/user.ts",
          "score": 0.95,
          "snippet": "export async function authenticateUser(email: string, password: string): Promise<User> {...}",
          "line": 15
        }
      ],
      "files": ["src/auth/user.ts"],
      "total": 5,
      "searchTime": 45
    }
  }
}
```

### Параметры ответа

| Параметр | Тип | Описание |
|----------|-----|----------|
| `query` | string | Оригинальный запрос |
| `results` | array | Массив найденных результатов |
| `results[].file` | string | Путь к файлу |
| `results[].score` | number | Релевантность (0-1) |
| `results[].snippet` | string | Фрагмент текста |
| `results[].line` | number | Номер строки |
| `files` | string[] | Уникальные файлы в результатах |
| `total` | number | Общее количество результатов |
| `searchTime` | number | Время поиска в мс |

## Примеры

### Пример 1: Успешный поиск

**Server → Client API (execute):**
```json
{
  "execute": {
    "rag-search": {
      "query": "как создать компонент Vue",
      "limit": 3
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "rag-search": {
      "query": "как создать компонент Vue",
      "results": [
        {
          "file": "src/components/Button.vue",
          "score": 0.92,
          "snippet": "<template>\n  <button class=\"btn\">{{ label }}</button>\n</template>",
          "line": 1
        },
        {
          "file": "docs/vue-components.md",
          "score": 0.85,
          "snippet": "## Создание компонента\n\nДля создания компонента используйте...",
          "line": 10
        },
        {
          "file": "src/components/Input.vue",
          "score": 0.78,
          "snippet": "export default {\n  name: 'InputComponent',\n  props: ['value']\n}",
          "line": 5
        }
      ],
      "files": ["src/components/Button.vue", "docs/vue-components.md", "src/components/Input.vue"],
      "total": 3,
      "searchTime": 32
    }
  }
}
```

### Пример 2: Нет результатов

**Client API → Server (result):**
```json
{
  "result": {
    "rag-search": {
      "query": "神秘的中国菜",
      "results": [],
      "files": [],
      "total": 0,
      "searchTime": 15
    }
  }
}
```

### Пример 3: Поиск с фильтрами

**Server → Client API (execute):**
```json
{
  "execute": {
    "rag-search": {
      "query": "обработка ошибок",
      "limit": 5,
      "filters": {
        "type": "typescript",
        "project": "a2a-server"
      }
    }
  }
}
```

**Client API → Server (result):**
```json
{
  "result": {
    "rag-search": {
      "query": "обработка ошибок",
      "results": [
        {
          "file": "src/middleware/error.ts",
          "score": 0.88,
          "snippet": "export class ErrorHandler implements ErrorMiddleware {...}",
          "line": 8
        }
      ],
      "files": ["src/middleware/error.ts"],
      "total": 1,
      "searchTime": 28
    }
  }
}
```

## Обработка ошибок

| Код ошибки | Сообщение | Описание |
|------------|-----------|----------|
| `INDEX_NOT_FOUND` | Index not found | Указанный индекс не найден |
| `SEARCH_ERROR` | Search error | Ошибка при выполнении поиска |
| `EMPTY_QUERY` | Empty query | Пустой поисковый запрос |
| `RATE_LIMIT` | Rate limit exceeded | Превышен лимит запросов |
| `SERVICE_UNAVAILABLE` | RAG service unavailable | RAG сервис недоступен |

## Поток выполнения

```
1. Server формирует execute.rag-search
2. Client API получает запрос
3. Client API валидирует запрос
4. Client API отправляет запрос в RAG Service
5. RAG Service выполняет векторный поиск
6. RAG Service возвращает результаты
7. Client API форматирует результаты
8. Client API возвращает result
9. Server получает result и переходит к следующему шагу
```

## Интеграция с RAG Service

### Запрос к RAG Service

```
POST /api/rag/search
Content-Type: application/json

{
  "query": "search query",
  "limit": 5,
  "threshold": 0.5
}
```

### Ответ RAG Service

```json
{
  "results": [
    {
      "file": "path/to/file.ts",
      "score": 0.95,
      "content": "...",
      "metadata": {
        "line": 10,
        "language": "typescript"
      }
    }
  ],
  "searchTime": 45
}
```

## Ограничения

- Максимальное количество результатов: 50
- Минимальный порог: 0.1
- Максимальная длина запроса: 1000 символов
- Таймаут запроса: 30 секунд

## Связанные файлы

- [server-invoke-response-execute.schema.json](../../json-schemas/server-invoke-response-execute.schema.json)
- [client-result.schema.json](../../json-schemas/client-result.schema.json)
- [RAG Integration Tests](../../tests/simulation/rag-entity-integration.test.ts)

## Следующий шаг

После получения `result.rag-search` сервер:
- Если действие завершено → переходит к [Этап 5: Завершение](../../STAGES/05-completion.md)
- Если требуется следующий шаг → переходит к [Этап 3: Выполнение](../../STAGES/03-execution.md)
