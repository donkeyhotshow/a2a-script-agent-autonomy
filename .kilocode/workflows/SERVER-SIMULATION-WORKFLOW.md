# Server Simulation Workflow

> Симуляції в `simulations/` - валідація відповідей **сервера**

## Огляд

Кожен крок — Client → Server → (LLM) → Server → Client.

Канон: `simulations/SCHEMA.md`.

## Структура

```
simulations/
├── dialog/              # Діалог з LLM
│   ├── 1/ request.json, response.json
│   ├── 2/ request.json, response.json
│   ├── 3/ request.json, request.md, response.json, response.md
│   ├── 4/ request.json, request.md, response.json, response.md
├── coder/        # Діалог + RAG + файли
├── fix-vue-imports/
├── fix-vue-imports-batched/
└── ...
```

## Типи файлів

| File | Direction | Description |
|------|-----------|-------------|
| `request.json` | Client → Server | Запит клієнта. |
| `server-transforms-request.md` | — | Обробка `request.json`, трансформація перед запитом у LLM. Опційно. |
| `request.md` | Server → LLM | MARKDOWN: system prompt + поточний стан (JSON у блоці). |
| `response.md` | LLM → Server | Очікуваний вивід LLM (наприклад `{ "message": "..." }`). |
| `server-transforms-response.md` | — | Обробка `response.md`, трансформація перед поверненням клієнту. Опційно. |
| `response.json` | Server → Client | Відповідь клієнту (context + execute). |

**Порядок:** request.json → server-transforms-request.md → request.md → response.md → server-transforms-response.md → response.json.

У кроках з LLM є .md; інші — лише .json; transform-файли опційні.

## Flow

```
Client              Server (transforms)       LLM
  │                   │                         │
  │ request.json      │                         │
  │──────────────────>│                         │
  │                   │ server-transforms-request.md → request.md
  │                   │─────────────────────────>│
  │                   │         response.md     │
  │                   │<─────────────────────────│
  │                   │ server-transforms-response.md → response.json
  │ response.json     │                         │
  │<──────────────────│                         │
```

## Перший запит

```json
{ "task": "допоможи розібратись з кодом" }
```

## Варіанти відповідей сервера

### З actions

```json
{
  "context": { "task": "..." },
  "actions": [
    { "action": "dialog", "title": "Діалог", ... }
  ],
  "fallbackActions": [...]
}
```

### З execute.form

```json
{
  "context": { "task": "...", "execution": {...} },
  "execute": {
    "form": { "input": [{ "name": "message", "type": "text", ... }] }
  }
}
```

### З execute (для дій)

```json
{
  "context": {...},
  "execute": {
    "rag-search": { "query": "..." },
    "read-file": { "path": "..." },
    "write-file": { "path": "...", "content": "..." },
    "execute-command": { "command": "npm test" }
  }
}
```

## Обробка двох типів дій

У першій відповіді: спочатку **actions** (первоочергово), потім **ai-actions** (другочергово). Для actions — кроки захардкоджені, сервер перемикає; для ai-actions — відображається список доступних кроків, наступний крок з відповіді LLM, можливий окремий запит на крок.

### 1. Actions (первоочергові, захардкоджені кроки)

**Логіка обробки:**
1. Клієнт надсилає `result` з результатом виконання кроку
2. Сервер читає `context.execution.action` та поточний `step`
3. Сервер перемикає `step` на наступний згідно з definition
4. Сервер повертає `execute` з наступним кроком

**Приклад для fix-vue-imports:**
```json
// Крок 2: Сервер повертає execute.script
{
  "context": {
    "task": "виправити імпорти",
    "execution": { "action": "fix-vue-imports", "step": "collect-files" }
  },
  "execute": {
    "script": {
      "input": "Знайти всі .vue файли в src/",
      "output": "[\"src/components/Header.vue\", ...]"
    }
  }
}

// Крок 3: Клієнт повертає результат
{
  "context": { ... },
  "result": { "script": { "output": "[\"src/components/Header.vue\", ...]" } }
}

// Крок 4: Сервер автоматично перемикає step
{
  "context": {
    "task": "виправити імпорти",
    "execution": { "action": "fix-vue-imports", "step": "process-files" }
  },
  "execute": {
    "script": {
      "input": "Знайти @/ імпорти в файлах",
      "output": "..."
    }
  }
}
```

**Ключові особливості:**
- `execution.step` змінюється сервером без участі LLM
- Сервер має повну мапу кроків з definition
- Результат попереднього кроку впливає на вибір наступного

### 2. AI-Actions (другочергові, діалог з LLM)

**Логіка обробки:** Сервер показує список доступних кроків; наступний крок визначається з відповіді LLM (не захардкоджена послідовність); можливі окремі запити на кожен крок.
1. Клієнт надсилає `result.message` (або результат execute)
2. Сервер відправляє контекст до LLM
3. LLM визначає наступну дію (read-file, write-file, rag-search, тощо)
4. Сервер повертає `execute` з результатом LLM

**Формати відповідей для AI-Actions:**

#### execute.form — очікування вводу від користувача
```json
{
  "context": { "execution": { "action": "dialog", "step": "llm" } },
  "execute": {
    "form": { "input": [{ "name": "message", "type": "text", "required": true }] }
  }
}
```

#### execute.llm — продовження діалогу з LLM
```json
{
  "context": { "execution": { "action": "coder", "step": "llm" } },
  "execute": {
    "llm": {
      "purpose": "Проаналізувати код і запропонувати виправлення",
      "context": "..."
    }
  }
}
```

#### execute.message — повідомлення від LLM
```json
{
  "context": { "execution": { "action": "dialog", "step": "llm" } },
  "execute": {
    "message": "Я проаналізував ваш код. Ось що я знайшов: ..."
  },
  "execute": {
    "form": { "input": [{ "name": "message", "type": "text" }] }
  }
}
```

#### execute з конкретними діями
```json
{
  "context": { "execution": { "action": "coder", "step": "llm" } },
  "execute": {
    "rag-search": { "query": "функція авторизації JWT" }
  }
}
```

**Ключові особливості:**
- `execution.step` = "llm" (або визначається динамічно)
- LLM вирішує наступну дію
- Можливість продовження через `execute.llm`
- Сервер не має жорсткої мапи кроків

### Порівняння обробки

| Аспект | Actions | AI-Actions |
|--------|---------|------------|
| Визначення кроків | Definition файли | LLM |
| Перемикання кроків | Сервер (автоматично) | LLM |
| Зміна execution.step | Сервер | Сервер (встановлює "llm") |
| Результат від LLM | Ні | Так |
| Приклади | fix-vue-imports | dialog, coder, coder-smart |

## Правила

1. **Перший запит** — лише `{ "task": "..." }`.
2. **Вибір дії** — `result.action` (не actionId).
3. **request.md** — завжди MARKDOWN (system prompt + стан), не чистий JSON.
4. **response.md** — лише очікуваний вивід LLM.
5. **response.json** = контекст із сервера + execute (form або result).
