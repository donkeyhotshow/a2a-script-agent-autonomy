# План: Unified JSON Frontend - Расширенный анализ

## 1. Анализ текущего состояния

### 1.1 Существующий Frontend (a2a-client/web/)

**Стек:**
- Vanilla JavaScript + VueFlow
- Vue 3 (через CDN)
- @vue-flow/core, @vue-flow/controls, @vue-flow/minimap

**Файлы:**
```
a2a-client/web/
├── index.html          # 4631 chars - основная страница
├── css/
│   └── style.css      # 19632 chars - стили
└── js/
    ├── sessions.js    # 28948 chars - управление сессиями
    └── flow/
        ├── index.js   # 17834 chars - инициализация VueFlow
        ├── nodes.js  # 16150 chars - кастомные ноды
        └── protocol.js # 25568 chars - маппинг протокола
```

### 1.2 Типы данных (a2a-client/packages/types/)

```typescript
// Текущие типы в a2a-client/packages/types/src/index.ts

// Task
type TaskType = 'analyze' | 'refactor' | 'test' | 'document' | 'fix' | 'create' | 'delete';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  target?: string;
  progress?: number;
}

// ContextBlock
interface ContextBlock {
  version: '1.0';
  session_id: string;
  new_task?: string[];
  tasks?: Task[];
  errors?: ProtocolError[];
}

// Action
interface Action {
  id?: string;
  title?: string;
  matchScore?: number;
  subActions?: SubAction[];
}
```

### 1.3 Существующий план (a2a-client/plans/unified-ui-plan.md)

Уже есть план на 247 строк с:
- Структура страницы на VueFlow
- User Flow
- Компоненты (Search Bar, Action Cards, Tickets Panel)
- 4 этапа реализации
- Маппинг протокола на VueFlow

---

## 2. Расширенный анализ: что нужно для Unified JSON

### 2.1 Типы ответов сервера (из симуляций)

**Action Proposal (task_request → action_proposal):**
```json
{
  "result": {
    "context": {
      "tasks": [{
        "id": "fix-vue-imports",
        "type": "analyze",
        "status": "in_progress",
        "progress": 0
      }]
    },
    "proposedActions": [{
      "actionId": "fix-vue-imports-batch",
      "title": "Исправить сломанные импорты",
      "subActions": [...]
    }],
    "fallbackActions": [...]
  }
}
```

**Action Executing (approve_action → action_executing):**
```json
{
  "result": {
    "executingAction": {
      "actionId": "collect",
      "title": "Collect Vue and TypeScript files",
      "dsl": {...}
    },
    "nextSteps": [...]
  }
}
```

**Action Progress (step_result → action_progress):**
```json
{
  "result": {
    "context": {
      "tasks": [{
        "id": "fix-vue-imports",
        "status": "in_progress",
        "progress": 25
      }]
    },
    "executingAction": {...},
    "nextSteps": [...]
  }
}
```

### 2.2 Что уже реализовано в web/js/flow/

**protocol.js:**
- ✅ A2AClient класс для коммуникации с сервером
- ✅ Методы: request(), createRequest(), waitForCompletion()
- ✅ Обработка различных типов ответов

**nodes.js:**
- ✅ Custom VueFlow узлы через Vue 3 h() функции
- ✅ createNodeWrapper() - базовая обертка
- ✅ Поддержка target/source handles

**index.js:**
- ✅ Инициализация VueFlow
- ✅ Добавление нод
- ✅ Подключение event listeners

### 2.3 Что НЕ реализовано

1. **Парсинг Unified JSON ответов** - нет единого парсера
2. **Валидация ответов** - нет Zod/JSON Schema
3. **Обработка всех типов действий** - только базовые
4. **UI для subActions** - нет рендеринга вложенных действий
5. **Progress tracking** - нет визуализации прогресса
6. **Error handling UI** - нет отображения ошибок

---

## 3. План реализации (детальный)

### Этап 1: Unified JSON Parser (2 дня)

**1.1 Создать парсер ответов**
```
a2a-client/src/json/
├── parser.ts        # Основной парсер
├── types.ts         # TypeScript типы для ответов
├── validator.ts     # Валидация через Zod
└── mapper.ts       # Маппинг на VueFlow
```

**1.2 Определить типы ответов**
```typescript
type ResponseType = 
  | 'action_proposal'    // предложение действий
  | 'action_executing'  // начало выполнения
  | 'action_progress'   // прогресс выполнения
  | 'action_completed'  // завершено
  | 'action_error';     // ошибка

interface ServerResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    context: ContextBlock;
    result: ActionResult;
  };
}
```

### Этап 2: VueFlow компоненты (3 дня)

**2.1 Кастомные ноды для каждого типа**

| Тип ответа | Нода | Описание |
|------------|------|----------|
| action_proposal | ProposalNode | Карточка с предложениями |
| action_executing | ExecutingNode | Выполняемое действие |
| action_progress | ProgressNode | Прогресс бар |
| action_completed | ResultNode | Результат |
| action_error | ErrorNode | Ошибка |

**2.2 SubActions визуализация**
- Вложенный список внутри ProposalNode
- Connecting edges между主 узлами

### Этап 3: UI компоненты (2 дня)

**3.1 Основные компоненты**
- SearchBar с debounce
- ActionCardsList
- TicketPanel (активные тикеты)
- PropertiesPanel

**3.2 Интерактивность**
- Drag & drop нод
- Zoom & pan
- Node selection

### Этап 4: Интеграция (2 дня)

**4.1 Подключение к API**
- Использовать существующий A2AClient
- WebSocket для real-time обновлений

**4.2 Обработка ошибок**
- Timeout handling
- Retry логика
- Error display

---

## 4. Технические детали

### 4.1 Структура файлов после реализации

```
a2a-client/
├── packages/
│   └── json/              # НОВЫЙ ПАКЕТ
│       ├── src/
│       │   ├── parser.ts
│       │   ├── types.ts
│       │   ├── validator.ts
│       │   └── index.ts
│       └── package.json
├── web/
│   ├── js/
│   │   ├── app.js        # Обновить
│   │   ├── flow/
│   │   │   ├── nodes.js  # Расширить
│   │   │   └── protocol.js # Расширить
│   │   └── json/         # НОВЫЙ
│   │       └── ui.ts    # UI компоненты
│   └── index.html
└── plans/
    └── frontend-unified-json-plan.md
```

### 4.2 Dependencies

```json
{
  "dependencies": {
    "@vue-flow/core": "^1.48.2",
    "@vue-flow/background": "^1.3.2",
    "@vue-flow/controls": "^1.1.3",
    "@vue-flow/minimap": "^1.5.4",
    "zod": "^3.22.0"  // Добавить для валидации
  }
}
```

---

## 5. Критерии готовности

### Должно работать:
- [ ] Парсинг любого типа ответа сервера
- [ ] Валидация через Zod схемы
- [ ] Отображение ProposalNode с subActions
- [ ] Отображение ExecutingNode с progress
- [ ] Connecting edges между主 узлами
- [ ] SearchBar с поиском по экшенам
- [ ] TicketPanel с активными тикетами

### Тесты:
- [ ] Unit тесты для парсера
- [ ] Integration тесты для VueFlow
- [ ] E2E тесты через Playwright

---

## 6. Связанные файлы

- [a2a-client/plans/unified-ui-plan.md](./unified-ui-plan.md) - Базовый план
- [plans/IMPLEMENTATION_PLANS.md](../plans/IMPLEMENTATION_PLANS.md) - Общие планы
- [simulations/pilot/schemas.ts](../simulations/pilot/schemas.ts) - Схемы валидации
- [a2a-client/packages/types/src/index.ts](../packages/types/src/index.ts) - Базовые типы

---

**Дата:** 2026-02-25
**Статус:** Анализ завершен, готов к реализации
