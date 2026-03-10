# Этап 4: Результат

## Описание

Клиент возвращает результаты выполненного действия обратно серверу.

## Направление

**Client API → A2A Server**

## Схема потока

```
Web UI (result) → Client API → request.json (with result) → Server
```

## Формат result

### Для каждого типа действия используется action-key shape

```json
// result для read-file
{
  "result": {
    "read-file": {
      "path": "src/auth.js",
      "content": "export function auth() {...}"
    }
  }
}

// result для write-file
{
  "result": {
    "write-file": {
      "path": "src/auth.js",
      "success": true,
      "bytesWritten": 1024
    }
  }
}

// result для execute-command
{
  "result": {
    "execute-command": {
      "command": "npm test",
      "exitCode": 0,
      "stdout": "Test Suites: 1 passed, 1 total",
      "stderr": ""
    }
  }
}

// result для rag-search
{
  "result": {
    "rag-search": {
      "query": "authentication function",
      "results": [
        {
          "file": "src/auth.js",
          "score": 0.95,
          "snippet": "export function auth() {...}"
        }
      ],
      "files": ["src/auth.js"]
    }
  }
}

// result для form (message)
{
  "result": {
    "message": "привет, мне нужна помощь с кодом"
  }
}

// result для form (choice)
{
  "result": {
    "choice": "fix-vue-imports"
  }
}
```

## Обработка на сервере

1. Валидация result по схеме действия
2. Обновление context.execution.step
3. Определение следующего шага:
   - **Actions**: автоматический переход к следующему шагу
   - **AI-Actions**: формирование LLM prompt с результатом

## request.json структура

```json
{
  "context": {
    "task": "исправить импорты",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "result": {
    "read-file": {
      "path": "src/App.vue",
      "content": "<template>..."
    }
  }
}
```

## Следующий этап

После обработки результата:
- Если действие завершено → [Этап 5: Завершение](05-completion.md)
- Если требуется следующий шаг → [Этап 3: Выполнение](03-execution.md)

## References

- [PROTOCOL.md](../PROTOCOL.md)
- [SCHEMAS.md](../SCHEMAS.md)
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md)
- [server-invoke-request.schema.json](../json-schemas/server-invoke-request.schema.json)
- [client-result.schema.json](../json-schemas/client-result.schema.json)
