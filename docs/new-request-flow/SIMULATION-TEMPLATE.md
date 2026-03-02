# Шаблон для создания новых симуляций

Шаблон для создания симуляций в `simulations/<simulation-name>/`.

## Структура директории

```
simulations/
└── <simulation-name>/           # kebab-case, описательное название
    ├── description.md           # Описание симуляции (цель, сценарий)
    ├── analysis.md              # Анализ завершённой симуляции
    ├── 1/                       # Шаг 1 (инициализация)
    │   ├── request.json
    │   └── response.json
    ├── 2/                       # Шаг 2 (выбор действия)
    │   ├── request.json
    │   └── response.json
    ├── 3/                       # Шаг 3 (первый LLM вызов)
    │   ├── request.json
    │   ├── server-transforms-request.json   # Опционально
    │   ├── request.md
    │   ├── response.md
    │   ├── server-transforms-response.json  # Опционально
    │   └── response.json
    └── ...
```

---

## Шаг 1: Инициализация (request.json)

**Файл:** `1/request.json`

```json
{
  "task": "описание задачи пользователя"
}
```

**Назначение:** Первый запрос от пользователя, сервер определяет доступные действия.

---

## Шаг 1: Инициализация (response.json)

**Файл:** `1/response.json`

```json
{
  "context": {
    "task": "описание задачи пользователя"
  },
  "actions": [
    {
      "action": "action-name",
      "title": "Название действия",
      "description": "Описание что делает действие",
      "priority": 10,
      "matchScore": 0.95,
      "steps": [
        {
          "action": "step-name",
          "title": "Название шага",
          "description": "Описание шага",
          "priority": 10,
          "input": "none",
          "output": "data_type[]"
        }
      ]
    }
  ],
  "fallbackActions": [
    {
      "mode": "auto-ai",
      "title": "AI Action Generator",
      "description": "Згенерувати новий екшен за допомогою LLM",
      "fallbackType": "llm_generation"
    },
    {
      "mode": "task-decomposition",
      "title": "Декомпозиція задачі",
      "description": "Розбити задачу на підзадачі вручну",
      "fallbackType": "manual"
    }
  ]
}
```

---

## Шаг 2: Выбор действия (request.json)

**Файл:** `2/request.json`

```json
{
  "context": {
    "task": "описание задачи пользователя"
  },
  "result": {
    "choice": "action-name"
  }
}
```

**Или для legacy:**

```json
{
  "context": {
    "task": "описание задачи пользователя"
  },
  "result": {
    "action": "action-name"
  }
}
```

---

## Шаг 2: Выбор действия (response.json)

**Файл:** `2/response.json`

**Для Actions (hardcoded steps):**

```json
{
  "context": {
    "task": "описание задачи пользователя",
    "execution": {
      "action": "action-name",
      "step": "first-step-name"
    }
  },
  "execute": {
    "script": {
      "input": {
        "param1": "value1"
      },
      "output": "output_type[]",
      "code": "// DSL code\nconst result = await script.execute('step-name', { param1 });"
    }
  }
}
```

**Для AI-Actions (LLM-driven):**

```json
{
  "context": {
    "task": "описание задачи пользователя",
    "execution": {
      "action": "action-name",
      "step": "llm-request"
    }
  },
  "execute": {
    "form": {
      "input": [
        {
          "name": "message",
          "type": "text",
          "label": "Повідомлення",
          "required": true
        }
      ]
    }
  }
}
```

---

## Шаг 3: Выполнение с LLM

### request.json

```json
{
  "context": {
    "task": "описание задачи пользователя",
    "execution": {
      "action": "action-name",
      "step": "llm-request"
    },
    "history": [
      {
        "role": "user",
        "message": "предыдущее сообщение"
      }
    ]
  },
  "result": {
    "message": "текущее сообщение пользователя"
  }
}
```

### server-transforms-request.json (опционально)

```markdown
## Обработка запроса

Сервер получает `request.json` и:

1. Добавляет `role: "user"` к `result.message` в историю
2. Формирует prompt для LLM
3. Отправляет в `request.md`

## Правила

- Все поля из `context` передаются без изменений
- `result.message` добавляется в `history` с `role: "user"`
```

### request.md

```markdown
## System Prompt

Ти AI-асистент. Твоя задача — [описание задачи].

Завжди відповідай у форматі JSON:

\`\`\`json
{
  "message": "твоя відповідь користувачу",
  "action": "optional-action-name",
  "params": { }
}
\`\`\`

## Поточний стан (request)

\`\`\`json
{
  "context": {
    "task": "описание задачи пользователя",
    "execution": {
      "action": "action-name",
      "step": "llm-request"
    },
    "history": [
      {
        "role": "user",
        "message": "предыдущее сообщение"
      }
    ]
  },
  "message": "текущее сообщение пользователя"
}
\`\`\`
```

### response.md

```markdown
## Очікувана відповідь LLM

\`\`\`json
{
  "message": "відповідь від AI",
  "action": "read-file",
  "params": {
    "path": "src/example.js"
  }
}
\`\`\`
```

### server-transforms-response.json (опционально)

```markdown
## Обработка ответа

Сервер получает `response.md` от LLM и:

1. Добавляет ответ LLM в `history` с `role: "assistant"`
2. Транслирует `action`/`params` в `execute`
3. Формирует `response.json`

## Правила

- `message` → `context.history` и `execute.message`
- `action`/`params` → соответствующий `execute.<action-type>`
```

### response.json

```json
{
  "context": {
    "task": "описание задачи пользователя",
    "execution": {
      "action": "action-name",
      "step": "llm-request"
    },
    "history": [
      {
        "role": "user",
        "message": "предыдущее сообщение"
      },
      {
        "role": "assistant",
        "message": "відповідь від AI"
      }
    ]
  },
  "execute": {
    "message": "відповідь від AI",
    "read-file": {
      "path": "src/example.js"
    }
  }
}
```

---

## Шаг 4: Результат выполнения клиентом (request.json)

**Файл:** `4/request.json`

```json
{
  "context": {
    "task": "описание задачи пользователя",
    "execution": {
      "action": "action-name",
      "step": "llm-request"
    },
    "history": [
      {
        "role": "user",
        "message": "предыдущее сообщение"
      },
      {
        "role": "assistant",
        "message": "відповідь від AI"
      }
    ]
  },
  "result": {
    "read-file": {
      "path": "src/example.js",
      "content": "// файл content\nconst x = 1;"
    }
  }
}
```

---

## Шаг N: Финальный результат (response.json)

**Файл:** `N/response.json`

```json
{
  "context": {
    "task": "описание задачи пользователя",
    "execution": {
      "action": "action-name",
      "step": "final-step",
      "status": "completed"
    }
  },
  "execute": {
    "form": {
      "title": "Готово",
      "choices": [
        {
          "id": "done",
          "label": "OK"
        }
      ]
    }
  },
  "finalResult": {
    "action": "action-name",
    "summary": {
      "items_processed": 10,
      "items_fixed": 8,
      "errors": 0
    }
  }
}
```

---

## Примеры action-key shape

### Execute команды

```json
{
  "execute": {
    "script": {
      "input": { "rootDir": "." },
      "output": "files[]",
      "code": "const result = await script.execute('scan', { rootDir });"
    },
    "rag-search": {
      "query": "поисковый запрос"
    },
    "read-file": {
      "path": "src/example.js"
    },
    "write-file": {
      "path": "src/output.js",
      "content": "// generated code"
    },
    "execute-command": {
      "command": "npm test"
    },
    "form": {
      "title": "Заголовок",
      "choices": [
        { "id": "continue_search", "label": "Продовжити пошук" },
        { "id": "save_report", "label": "Зберегти звіт" }
      ]
    },
    "message": "Повідомлення для користувача"
  }
}
```

### Result ответы

```json
{
  "result": {
    "script": {
      "files": ["src/file1.js", "src/file2.js"]
    },
    "rag-search": {
      "results": [
        { "file": "src/auth.js", "score": 0.95, "snippet": "..." }
      ],
      "files": ["src/auth.js"],
      "query": "поисковый запрос"
    },
    "read-file": {
      "path": "src/example.js",
      "content": "// file content"
    },
    "write-file": {
      "path": "src/output.js",
      "success": true
    },
    "execute-command": {
      "command": "npm test",
      "exitCode": 0,
      "stdout": "...",
      "stderr": ""
    },
    "choice": "continue_search",
    "message": "текст відповіді"
  }
}
```

---

## Чеклист создания симуляции

### Перед началом

- [ ] Определить тип: Action (hardcoded) или AI-Action (LLM-driven)
- [ ] Придумать название в kebab-case
- [ ] Описать цель и сценарий в `description.md`

### Структура

- [ ] Создать директорию `simulations/<name>/`
- [ ] Создать `description.md` с описанием
- [ ] Создать шаги `1/`, `2/`, `3/` и т.д.
- [ ] Пронумеровать шаги последовательно

### Файлы каждого шага

- [ ] Шаг 1: `request.json` с `{ "task": "..." }` и `response.json` с `actions`
- [ ] Шаг 2: `request.json` с `result.choice` и `response.json` с первым `execute`
- [ ] Шаги с LLM: добавить `request.md` и `response.md`
- [ ] Опционально: добавить `server-transforms-*.md`

### Валидация action-key shape

- [ ] Все `result` используют action-key shape
- [ ] Все `execute` используют action-key shape
- [ ] Нет flat `"action": "..."` с параметрами на одном уровне

### Context

- [ ] `context.task` сохраняется во всех шагах
- [ ] `context.execution.action` присутствует после выбора действия
- [ ] `context.execution.step` обновляется корректно
- [ ] `context.history` обновляется для AI-Actions

### Naming

- [ ] Action ID: kebab-case (например, `fix-vue-imports`)
- [ ] Step ID: `<domain>-<operation>` (например, `vue-import-detect`)
- [ ] Form choices: snake_case (например, `continue_search`)

### Финализация

- [ ] Финальный шаг имеет `"status": "completed"` в `execution`
- [ ] Финальный `response.json` содержит `finalResult` (опционально)
- [ ] Создать `analysis.md` с анализом симуляции

---

## Примеры реальных симуляций

- **Actions:** [`fix-vue-imports`](../simulations/fix-vue-imports/description.md) — hardcoded steps, сервер переключает
- **AI-Actions:** [`dialog`](../simulations/dialog/description.md) — LLM-driven диалог
- **AI-Actions:** [`coder`](../simulations/coder/description.md) — LLM + RAG + файлы

---

## Ссылки

- [PROTOCOL.md](./PROTOCOL.md) — полное описание протокола
- [SIMULATION-FORMAT.md](./SIMULATION-FORMAT.md) — формат файлов симуляций
- [SCHEMA.md](../simulations/SCHEMA.md) — каноническая схема
