# Симуляция: fix-vue-imports

Полный протокол взаимодействия Client → Server для екшена "Виправити зламані імпорти у Vue файлах".

## Кто что делает

| Компонент                   | Ответственность                                                            | Порт        |
|-----------------------------|----------------------------------------------------------------------------|-------------|
| **Web** (a2a-client/web)    | Пользовательский интерфейс, ввод задачи, отображение панелей сессий        | 5173 (Vite) |
| **Client API** (a2a-client) | Хранение сессий, управление состоянием, выполнение скриптов, координация   | 3001        |
| **Server** (a2a-server)     | Stateless - обработка запросов, генерация actions/steps, отправка скриптов | 3000        |

### Разделение обязанностей

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WEB (порт 5173)                             │
│  - Ввод задачи пользователем                                         │
│  - Отображение панелей сессий                                        │
│  - Кнопки: Выбрать действие, Далее, Авто, Стоп, Отменить          │
│  - НЕ знает адрес сервера                                           │
│  - Общается только с Client API (порт 3001)                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLIENT API (порт 3001)                           │
│  - Хранит сессии и состояние                                        │
│  - Создает сессии                                                   │
│  - Отправляет task на Server                                        │
│  - Получает actions/steps от Server                                 │
│  - Выполняет DSL скрипты локально                                   │
│  - Отправляет результаты на Server                                  │
│  - Знает адрес Server (localhost:3000)                             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVER (порт 3000)                            │
│  - STATELESS - НЕ хранит сессии                                     │
│  - Генерирует actions и steps                                       │
│  - Отправляет DSL скрипты для выполнения                            │
│  - Принимает результаты выполнения                                  │
│  - Возвращает top-level result (completion)                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Обзор

Эта симуляция демонстрирует полный поток выполнения екшена:

1. Пользователь отправляет задачу
2. Сервер предлагает варианты виконання через `execute.form.choices` (список опцій)
3. Пользователь выбирает действие
4. Сервер отправляет скрипты для выполнения на клиенте
5. Клиент выполняет скрипты и возвращает результаты
6. Сервер завершает выполнение и возвращает финальный результат



---

## Шаг 1: Первый запрос (task request)

Клиент отправляет только задачу пользователя.

### Request (Client → Server)

```json
{
  "task": "виправити імпорти у vue компонентах"
}
```

### Response (Server → Client)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах"
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        {
          "id": "fix-vue-imports",
          "label": "Виправити зламані імпорти у Vue файлах (автомат)"
        },
        {
          "id": "auto-ai",
          "label": "AI Action Generator — згенерувати екшен за допомогою LLM"
        },
        {
          "id": "task-decomposition",
          "label": "Декомпозиція задачі вручну"
        }
      ]
    }
  }
}
```

---

## Шаг 2: Выбор действия (approve action)

Клиент отправляет выбранное пользователем действие.

### Request (Client → Server)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах"
  },
  "result": {
    "choice": "fix-vue-imports"
  }
}
```

### Response (Server → Client)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "execute": {
    "script": {
      "input": {
        "rootDir": ".",
        "filePattern": "**/*.vue"
      },
      "output": "broken_imports[]",
      "code": "// vue-import-detect.dsl\n// Сканування Vue файлів і пошук битих імпортів\n\nconst result = await script.execute('vue-import-detect', { rootDir, filePattern });"
    }
  }
}
```

> **Примечание:** Сервер возвращает `execute."script"` - DSL скрипт для выполнения на клиенте.

---

## Шаг 3: Результат первого шага (step result)

Клиент выполнил скрипт и возвращает результат.

### Request (Client → Server)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "result": {
    "broken_imports": [
      { "file": "resources/js/Pages/Auth/Login.vue", "line": 3, "import": "import Header from '../components/Header'" },
      { "file": "resources/js/Pages/Auth/Register.vue", "line": 5, "import": "import { helper } from '../../utils/helpers'" },
      { "file": "resources/js/components/UserCard.vue", "line": 2, "import": "import { userStore } from '@/stores/user'" }
    ]
  }
}
```

### Response (Server → Client)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-resolve"
    }
  },
  "execute": {
    "script": {
      "input": {
        "broken_imports": [
          { "file": "resources/js/Pages/Auth/Login.vue", "line": 3, "import": "import Header from '../components/Header'" },
          { "file": "resources/js/Pages/Auth/Register.vue", "line": 5, "import": "import { helper } from '../../utils/helpers'" },
          { "file": "resources/js/components/UserCard.vue", "line": 2, "import": "import { userStore } from '@/stores/user'" }
        ],
        "aliases": { "@": "resources/js", "~": "resources" }
      },
      "output": "patches[]",
      "code": "// vue-import-resolve.dsl\n// Вирішення правильних шляхів для зламаних імпортів\n\nconst result = await script.execute('vue-import-resolve', { broken_imports, aliases });"
    }
  }
}
```

---

## Шаг 4: Результат второго шага (step result)

### Request (Client → Server)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-resolve"
    }
  },
  "result": {
    "patches": [
      { "file": "resources/js/Pages/Auth/Login.vue", "line": 3, "from": "../components/Header", "to": "@/components/Header" },
      { "file": "resources/js/Pages/Auth/Register.vue", "line": 5, "from": "../../utils/helpers", "to": "@/utils/helpers" },
      { "file": "resources/js/components/UserCard.vue", "line": 2, "from": "@/stores/user", "to": "@/stores/userStore" }
    ]
  }
}
```

### Response (Server → Client)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-apply"
    }
  },
  "execute": {
    "script": {
      "input": {
        "patches": [
          { "file": "resources/js/Pages/Auth/Login.vue", "line": 3, "from": "../components/Header", "to": "@/components/Header" },
          { "file": "resources/js/Pages/Auth/Register.vue", "line": 5, "from": "../../utils/helpers", "to": "@/utils/helpers" },
          { "file": "resources/js/components/UserCard.vue", "line": 2, "from": "@/stores/user", "to": "@/stores/userStore" }
        ]
      },
      "output": "fixed_files[]",
      "code": "// vue-import-apply.dsl\n// Застосування виправлень до файлів\n\nconst result = await script.execute('vue-import-apply', { patches });"
    }
  }
}
```

---

## Шаг 5: Результат третьего шага + завершение (final result)

### Request (Client → Server)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-apply"
    }
  },
  "result": {
    "fixed_files": [
      { "file": "resources/js/Pages/Auth/Login.vue", "status": "fixed" },
      { "file": "resources/js/Pages/Auth/Register.vue", "status": "fixed" },
      { "file": "resources/js/components/UserCard.vue", "status": "fixed" }
    ]
  }
}
```

### Response (Server → Client)

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-cleanup",
      "status": "completed"
    }
  },
  "execute": {
    "script": {
      "input": {},
      "output": "cleanup_count",
      "code": "// vue-import-cleanup.dsl\n// Очищення тимчасових файлів\n\nconst result = await script.execute('vue-import-cleanup', {});"
    }
  },
  "result": {
    "completed": true,
    "fix-vue-imports": {
      "summary": {
        "broken_imports_found": 3,
        "patches_resolved": 3,
        "files_fixed": 3,
        "cleanup_count": 0
      }
    }
  }
}
```

---

## Ключевые правила

### 1. Context Propagation

- Контекст **ВСЕГДА** возвращается сервером в каждом ответе
- Клиент **ВСЕГДА** отправляет тот же контекст обратно
- Контекст НЕ содержит sessionId/projectId (сервер stateless!)

### 2. Result Outside Context

- Результат выполнения **ВСЕГДА** находится вне context
- Это выходные данные предыдущего шага

### 3. Server Sends Scripts

- Сервер отправляет `execute."script"` с `input`, `output`, `code`
- Клиент выполняет скрипт локально
- Клиент отправляет результат обратно

### 4. Context Structure

```typescript
interface Context {
  task: string;
  execution?: {
    action: string;    // ID выбранного екшена
    step: string;      // ID текущего шага
    status?: string;   // "completed" для последнего шага
  };
}
```

### 5. Execute Structure

```typescript
interface Execute {
  script: {
    input: Record<string, any>;  // Входные данные для скрипта
    output: string;              // Ожидаемый формат вывода
    code: string;                // DSL код для выполнения
  };
}
```

---

## Диаграмма потока

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB (a2a-client/web)                           │
│                                                                              │
│  1. Пользователь вводит задачу: "виправити імпорти у vue компонентах"      │
│                                                                              │
│  2. Web отправляет POST /api/sessions { task, projectId }                │
│     на Client API (localhost:3001)                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT API (a2a-client)                             │
│                                                                              │
│  3. Client API создает сессию локально                                      │
│                                                                              │
│  4. Client API отправляет POST /api/v1/invoke { task }                    │
│     на Server (localhost:3000)                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER (a2a-server) - STATELESS                    │
│                                                                              │
│  5. Server обрабатывает task                                                │
│  6. Server возвращает { context, execute: { form: { choices } } }          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT API (a2a-client)                             │
│                                                                              │
│  7. Client API сохраняет form.choices (список опцій) в сессию              │
│  8. Client API возвращает { sessionId, execute.form.choices } на Web       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB (a2a-client/web)                           │
│                                                                              │
│  9. Web отображает список опцій (choices)                                  │
│ 10. Пользователь выбирает действие "fix-vue-imports"                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT API (a2a-client)                             │
│                                                                              │
│ 11. Client API отправляет { context, result: { choice } }                  │
│     на Server                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER (a2a-server) - STATELESS                    │
│                                                                              │
│ 12. Server возвращает { context.execution, execute."script" }                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT API (a2a-client)                             │
│                                                                              │
│ 13. Client API ВЫПОЛНЯЕТ script локально                                    │
│ 14. Client API отправляет { context, result: { broken_imports } }         │
│     на Server                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER (a2a-server) - STATELESS                    │
│                                                                              │
│ 15. Server возвращает следующий { execute."script" }                          │
│     ... (повторяется для каждого шага)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT API (a2a-client)                             │
│                                                                              │
│ 16. После последнего шага: Client API получает итоговый result              │
│ 17. Client API отдаёт его на Web                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB (a2a-client/web)                           │
│                                                                              │
│ 18. Web отображает итоговый результат                                      │
```

---

## Терминология

| Термин           | Описание                               |
|------------------|----------------------------------------|
| `context`        | Контекст выполнения (task + execution) |
| `actions`        | Список предложенных действий           |
| `steps`          | Подшаги выбранного действия            |
| `execution`      | Текущее состояние выполнения           |
| `execute."script"` | DSL скрипт для выполнения на клиенте   |
| `result`         | Результат выполнения скрипта           |
| `result` (top-level) | Итог / completion (только в конце) |

---

## Файлы симуляции

Оригинальные JSON файлы:

- `simulations/fix-vue-imports/1/request.json`
- `simulations/fix-vue-imports/1/response.json`
- `simulations/fix-vue-imports/2/request.json`
- `simulations/fix-vue-imports/2/response.json`
- `simulations/fix-vue-imports/3/request.json`
- `simulations/fix-vue-imports/3/response.json`
- `simulations/fix-vue-imports/4/request.json`
- `simulations/fix-vue-imports/4/response.json`
- `simulations/fix-vue-imports/5/request.json`
- `simulations/fix-vue-imports/5/response.json`
