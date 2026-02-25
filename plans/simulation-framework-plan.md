# План: Симуляційний фреймворк для Unified JSON Frontend

## Вступ

Цей план описує створення симуляційного фреймворку для тестування кожного non-placeholder екшену перед реалізацією unified JSON frontend. 

**Мета:** Створити можливість локально запускати симуляції, зберігати response.json для порівняння, та верифікувати протокол між клієнтом і сервером.

## 1. Аналіз поточної структури

### 1.1 a2a-server (серверна частина)

```
a2a-server/src/
├── actions/
│   ├── definitions/          # MD файли з екшенами
│   │   ├── fix-vue-imports.md
│   │   ├── analysis/
│   │   ├── generation/
│   │   ├── graph/
│   │   ├── hybrid/
│   │   └── yaml/
│   ├── action-processor.ts   # Обробник екшенів
│   ├── action-registry.ts    # Реєстр екшенів
│   └── action-service.ts     # Сервіс екшенів
├── protocol/                 # Протокол комунікації
├── types/                    # TypeScript типи
│   └── index.ts             # ContextBlock, Task, FileBlock
└── controllers/             # HTTP контролери
```

**Протокол (types/index.ts):**
- `ContextBlock` - версія '1.0', session_id, tasks[], errors[]
- `Task` - id, type, status, progress
- `FileBlock` - path, content, startLine, endLine

### 1.2 a2a-client (клієнтська частина)

```
a2a-client/
├── source-of-core/
│   └── admin-app/           # Legacy проект (референс для UI)
├── packages/
│   ├── api-client/          # Клієнт для сервера
│   ├── fs-utils/           # Файлові утиліти
│   ├── rag/                 # RAG індексація
│   └── script-runner/       # Виконання скриптів
├── plans/
│   └── unified-ui-plan.md   # Існуючий план UI
└── web/                     # Frontend
```

### 1.3 simulations/pilot (референс)

**ВНИМАНИЕ:** Все response.json в simulations/pilot/ - это ЭТАЛОНЫ (созданы вручную).

```
simulations/pilot/
├── analysis.md              # Опис воркфлоу
├── 1/
│   ├── request.json         # task_request
│   ├── response.json        # action_proposal + context
│   └── analysis.md
├── 2/
│   ├── request.json         # approve_action + context
│   ├── response.json        # action_executing + context
│   └── analysis.md
└── ... (кожен крок)
```

## 2. Референсна архітектура

### 2.1 Еталон відповіді сервера

Кожен серверний відповідь повинен відповідати стандарту:

```json
{
  "outcome": "action_proposal",
  "message": "Найден подходящий экшен в базе",
  "context": {
    "version": "1.0",
    "session_id": "uuid",
    "task": "задача користувача"
  },
  "proposedActions": [
    {
      "actionId": "fix-vue-imports",
      "title": "Заголовок екшену",
      "description": "Опис",
      "priority": 10,
      "matchScore": 0.95,
      "subActions": [
        {
          "actionId": "sub-action-id",
          "title": "Назва під-екшену",
          "input": "none|previous_output",
          "output": "result_type"
        }
      ]
    }
  ]
}
```

### 2.2 Структура симуляції

Кожна симуляція екшену має структуру:

```
simulations/<action-id>/
├── analysis.md              # Мета симуляції, очікувані результати
├── 1/
│   ├── request.json         # Перший запит (task_request)
│   ├── server-response.json # Відповідь сервера (ЗБЕРІГАЄТЬСЯ)
│   └── response.json        # Очікувана відповідь (для порівняння)
├── 2/
│   ├── request.json         # approve_action
│   ├── server-response.json 
│   └── response.json
└── ...
```

**Ключове правило:**
- `response.json` - **Еталон вимог** (створений вручну, цільова поведінка системи)
- `server-response.json` - реальна відповідь сервера (для порівняння та "дотягування" до еталону)

## 3. Список Non-Placeholder екшенів

### 3.1 Основні екшени (з повною імплементацією)

| Екшен | Файл | Sub-actions | Пріоритет |
|-------|------|-------------|-----------|
| fix-vue-imports | definitions/fix-vue-imports.md | 4 (detect→resolve→apply→cleanup) | HIGH |
| analyze-full | definitions/analysis/analyze-full.md | TBD | HIGH |
| hybrid-fix | definitions/hybrid/hybrid-fix.md | TBD | HIGH |
| generate-crud | definitions/generation/generate-crud.md | TBD | MEDIUM |

### 3.2 Екшени для аналізу

- `analyze-architecture` - аналіз архітектури
- `analyze-laravel` - аналіз Laravel коду
- `analyze-performance` - аналіз продуктивності
- `analyze-security` - аналіз безпеки
- `analyze-typescript` - аналіз TypeScript
- `analyze-vue` - аналіз Vue компонентів

### 3.3 Екшени для генерації

- `generate-controller` - генерація контролера
- `generate-crud` - генерація CRUD
- `generate-method` - генерація методу
- `generate-migration` - генерація міграції
- `generate-model` - генерація моделі
- `generate-test` - генерація тестів
- `generate-view` - генерація view

### 3.4 Графові екшени

- `graph-build` - побудова графа залежностей
- `graph-extract-entities` - екстракція сутностей
- `graph-extract-relations` - екстракція відносин
- `graph-impact` - аналіз впливу

### 3.5 Контекстні екшени

- `context-scan` - сканування контексту
- `context-query` - запити до контексту
- `context-rank` - ранжування контексту

## 4. Симуляційний фреймворк

### 4.1 Архітектура симуляції

```
┌─────────────────────────────────────────────────────────┐
│                   СИМУЛЯЦІЙНИЙ ФРЕЙМВОРК                 │
├─────────────────────────────────────────────────────────┤
│  1. Подготовка запроса                                   │
│     └── request.json (input, context)                   │
│                                                         │
│  2. Отправка на сервер                                   │
│     └── POST /api/v1/task                               │
│                                                         │
│  3. Получение ответа                                     │
│     └── server-response.json                            │
│                                                         │
│  4. Сравнение с эталоном                                │
│     └── diff: response.json vs server-response.json     │
│                                                         │
│  5. Результат                                           │
│     └── ✅ PASS / ❌ FAIL + diff                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 CLI інструмент для симуляцій

Створити скрипт для запуску симуляцій:

```bash
# Запуск однієї симуляції
npm run simulate fix-vue-imports

# Запуск всіх симуляцій
npm run simulate:all

# Порівняння результатів
npm run simulate:compare
```

### 4.3 Workflow кожної симуляції

```
STEP 1: task_request
┌──────────────────────────────────────────────┐
│ Client → Server                              │
│ {                                            │
│   "action": "task_request",                  │
│   "task": "описание задачи",                 │
│   "context": { ... }                         │
│ }                                            │
│                                              │
│ Server → Client                             │
│ {                                            │
│   "outcome": "action_proposal",             │
│   "proposedActions": [ ... ],                │
│   "context": { ... }                         │
│ }                                            │
└──────────────────────────────────────────────┘

STEP 2: approve_action
┌──────────────────────────────────────────────┐
│ Client → Server                              │
│ {                                            │
│   "action": "approve_action",                │
│   "actionId": "fix-vue-imports",             │
│   "context": { ... }                          │
│ }                                            │
│                                              │
│ Server → Client                             │
│ {                                            │
│   "outcome": "action_executing",             │
│   "execution": {                             │
│     "currentStep": 1,                        │
│     "totalSteps": 4                          │
│   }                                          │
│ }                                            │
└──────────────────────────────────────────────┘

STEP 3-N: step_result (повторюється для кожного sub-action)
┌──────────────────────────────────────────────┐
│ Client → Server                              │
│ {                                            │
│   "action": "step_result",                  │
│   "step": 1,                                 │
│   "result": { ... }                          │
│ }                                            │
│                                              │
│ Server → Client                             │
│ {                                            │
│   "outcome": "action_executing",             │
│   "execution": {                             │
│     "currentStep": 2,                        │
│     "history": [ ... ]                       │
│   }                                          │
│ }                                            │
└──────────────────────────────────────────────┘
```

## 5. Unified JSON Frontend - цільова архітектура

### 5.1 JSON Schema для UI

Основа - уніфікований JSON формат для всіх UI компонентів:

```json
{
  "ui": {
    "version": "1.0",
    "components": [
      {
        "id": "search-bar",
        "type": "search",
        "props": {
          "placeholder": "Що ви хочете зробити?",
          "debounce": 300
        }
      },
      {
        "id": "action-cards",
        "type": "list",
        "items": "actions",
        "itemTemplate": {
          "type": "card",
          "title": "{{title}}",
          "description": "{{description}}",
          "actions": ["run", "configure"]
        }
      },
      {
        "id": "tickets-panel",
        "type": "tickets",
        "statuses": ["running", "completed", "failed"]
      }
    ]
  },
  "data": {
    "actions": [],
    "tickets": [],
    "context": {}
  }
}
```

### 5.2 Референс з admin-app

Legacy проект `admin-app` використовує:
- JSON структуру для даних (modules, components)
- Валідацію через JSON Schema
- Компонентний підхід з JSON конфігурацією

**Ключові файли для референсу:**
- `admin-app/@lessons-learned.json` - уроки
- `admin-app/checklist-map.json` - мапа чеклістів
- `admin-app/app/Console/Commands/Helpers/ModuleValidate/` - валідація

### 5.3 Маппінг екшенів на UI компоненти

| Екшен | UI Компонент | JSON Конфіг |
|-------|--------------|-------------|
| search | SearchBar | type: search |
| action list | ActionCards | type: list, items: actions |
| execute | ActionForm | type: form |
| monitor | TicketsPanel | type: tickets |

## 6. План імплементації

### Фаза 1: Симуляційний фреймворк (1 тиждень)

```
1.1 Створити базову структуру симуляцій
    └── simulations/base/ (шаблон)
    
1.2 Імплементувати CLI для запуску
    └── scripts/simulate.js
    
1.3 Створити симуляцію для fix-vue-imports
    └── simulations/fix-vue-imports/
```

### Фаза 2: Протокол верифікація (1 тиждень)

```
2.1 Запустити симуляцію fix-vue-imports
    └── Зберегти server-response.json
    
2.2 Порівняти з response.json
    └── diff tools
    
2.3 Ітеративно виправити протокол
```

### Фаза 3: Додаткові симуляції (2 тижні)

```
3.1 analyze-full симуляція
3.2 hybrid-fix симуляція  
3.3 generate-crud симуляція
3.4 graph-build симуляція
```

### Фаза 4: Unified Frontend (2 тижні)

```
4.1 JSON Schema для всіх компонентів
4.2 Генерація UI з JSON
4.3 Інтеграція з API клієнтом
```

## 7. Технічні деталі

### 7.1 Файли для створення

```
scripts/
└── simulate.js           # CLI для симуляцій

simulations/
└── templates/
    └── base/
        ├── analysis.md
        ├── 1/
        │   ├── request.json
        │   └── response.json
        └── 2/
            ├── request.json
            └── response.json
```

### 7.2 Збереження результатів

- **response.json** - еталон вимог (цільова поведінка, створений вручну)
- **server-response.json** - реальна відповідь сервера
- **diff.html** - візуальний diff результатів

### 7.3 Автоматизація

```bash
# Генерація нової симуляції
npm run simulate:create fix-vue-imports

# Запуск з перезаписом server-response
npm run simulate:run fix-vue-imports

# Тільки порівняння
npm run simulate:compare fix-vue-imports
```

## 8. Критерії успіху

- [ ] Кожен non-placeholder екшен має симуляцію
- [ ] Симуляції проходять без помилок
- [ ] server-response.json зберігається окремо
- [ ] Diff показує 100% збіг для готових екшенів
- [ ] Unified JSON frontend відображає всі компоненти
- [ ] Legacy admin-app JSON підхід інтегрований

## 9. Залежності

- Node.js 18+
- a2a-server запущений локально
- API endpoint: http://localhost:3000/api/v1/

## 10. Ризики та пом'якшення

| Ризик | Пом'якшення |
|-------|-------------|
| Сервер не відповідає | Перевірка доступності перед симуляцією |
| Протокол змінюється | Версіонування через ContextBlock.version |
| Велика кількість екшенів | Пріоритизація за business value |

---

**Дата створення:** 2026-02-25  
**Автор:** Orchestrator  
**Версія:** 1.0
