# Анализ симуляции fix-vue-imports

> **⚠️ Важно:** Этот документ для исторической справки. Актуальная документация:
> - [PROTOCOL.md](PROTOCOL.md)
> - [SCHEMA.md](SCHEMA.md)

## Расположение

`simulations/fix-vue-imports/`

> **ВАЖНО:** Эта симуляция показывает **Client → Server** взаимодействие (через **`POST /api/v1/invoke`**).
>
> Ключевое правило: **Сервер полностью STATELESS** - НЕ хранит sessionId/projectId!

---

## Правильный формат (из симуляций)

### Шаг 1: Первый запрос

**request.json:**

```json
{
  "task": "виправити імпорти у vue компонентах"
}
```

> Только `task` - сервер не знает sessionId/projectId, это на стороне Client

**response.json:**

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

### Шаг 2: Выбор действия

**request.json:**

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

> Контекст возвращается как есть из предыдущего ответа!
> `result.action` - выбранное пользователем действие

**response.json:**

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
      "input": { "rootDir": ".", "filePattern": "**/*.vue" },
      "output": "broken_imports[]",
      "code": "// vue-import-detect.dsl..."
    }
  }
}
```

---

### Шаг 3: Результат первого шага

**request.json:**

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
    "broken_imports": [...]
  }
}
```

> Контекст точно такой же как в предыдущем ответе!
> `result` содержит выходные данные предыдущего шага

**response.json:**

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
      "input": { "broken_imports": [...], "aliases": {...} },
      "output": "patches[]",
      "code": "// vue-import-resolve.dsl..."
    }
  }
}
```

---

### Шаг 5: Завершение

**response.json (финальный):**

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
    "script": {...}
  },
  "finalResult": {
    "action": "fix-vue-imports",
    "summary": {
      "broken_imports_found": 3,
      "files_fixed": 3
    }
  }
}
```

---

## Ключевые правила

### 1. Context Propagation

- Контекст **ВСЕГДА** возвращается сервером
- Клиент **ВСЕГДА** отправляет тот же контекст обратно
- Контекст не должен содержать sessionId/projectId (сервер stateless!)

### 2. Result Outside Context

- Результат выполнения **ВСЕГДА** находится вне context
- Это выходные данные предыдущего шага

### 3. Server Sends Scripts

- Сервер отправляет `execute.script` с `input`, `output`, `code`
- Клиент выполняет скрипт локально
- Клиент отправляет результат обратно

### 4. No promiseId

- Сервер **НЕ** использует promiseId для асинхронности
- Всё синхронно - сервер отправляет скрипт, клиент выполняет и возвращает результат

---

## Терминология

| Термин           | Описание                                              |
|------------------|-------------------------------------------------------|
| `actions`        | Список предложенных действий (было `proposedActions`) |
| `steps`          | Подшаги действия (было `subActions`)                  |
| `action`         | ID действия/шага (было `actionId`)                    |
| `execution`      | Текущее состояние выполнения                          |
| `step`           | Текущий шаг в execution                               |
| `execute.script` | Скрипт для выполнения на клиенте                      |
| `finalResult`    | Итоговый результат (только в конце)                   |

---

## Файлы симуляции

| Файл              | Назначение                  |
|-------------------|-----------------------------|
| `1/request.json`  | Первый запрос - только task |
| `1/response.json` | Ответ с execute.form.choices |
| `2/request.json`  | Выбор действия              |
| `2/response.json` | Первый execute с script     |
| `3/request.json`  | Результат первого шага      |
| `3/response.json` | Следующий execute           |
| `4/request.json`  | Результат второго шага      |
| `4/response.json` | Следующий execute           |
| `5/request.json`  | Результат третьего шага     |
| `5/response.json` | finalResult                 |
| `analysis.md`     | Этот файл                   |

---

## Что НЕправильно (старые симуляции)

❌ `sessionId`/`projectId` в context - сервер stateless!  
❌ `promiseId` - не используется, синхронное выполнение  
❌ `proposedActions` - правильно `actions`  
❌ `subActions` - правильно `steps`  
❌ `actionId` - правильно `action`  
❌ `dsl` + `dslScript` - правильно `script` с `input`, `output`, `code`
