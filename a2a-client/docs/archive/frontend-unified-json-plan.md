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
├── index.html          # Основная страница
├── css/
│   └── style.css      # Стили
└── js/
    ├── sessions.js    # Управление сессиями
    └── flow/
        ├── index.js   # Инициализация VueFlow
        ├── nodes.js   # Кастомные ноды
        └── protocol.js # Маппинг протокола
```

### 1.2 Типы данных (a2a-client/packages/types/)

```
typescript
// Текущие типы в a2a-client/packages/types/src/index.ts

type TaskType = 'analyze' | 'refactor' | 'test' | 'document' | 'fix' | 'create' | 'delete';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  target?: string;
  progress?: number;
}

interface ContextBlock {
  version: '1.0';
  session_id: string;
  new_task?: string[];
  tasks?: Task[];
  errors?: ProtocolError[];
}

interface Action {
  id?: string;
  title?: string;
  matchScore?: number;
  subActions?: SubAction[];
}
```

---

## 2. Расширенный анализ: что нужно для Unified JSON

### 2.1 Типы ответов сервера

**Action Proposal:**

```
json
{
  "result": {
    "context": { "tasks": [...] },
    "proposedActions": [...],
    "fallbackActions": [...]
  }
}
```

**Action Executing:**

```
json
{
  "result": {
    "executingAction": { "actionId": "collect" },
    "nextSteps": [...]
  }
}
```

**Action Progress:**

```
json
{
  "result": {
    "context": { "tasks": [...] },
    "executingAction": {...},
    "nextSteps": [...]
  }
}
```

### 2.2 Что уже реализовано

- ✅ A2AClient класс для коммуникации с сервером
- ✅ Custom VueFlow узлы
- ✅ Инициализация VueFlow
- ✅ Обработка различных типов ответов

### 2.3 Что НЕ реализовано

1. Парсинг Unified JSON ответов
2. Валидация ответов (Zod)
3. Обработка всех типов действий
4. UI для subActions
5. Progress tracking
6. Error handling UI

---

## 3. План реализации

### Этап 1: Unified JSON Parser

Создать парсер ответов:

- parser.ts - основной парсер
- types.ts - TypeScript типы
- validator.ts - валидация через Zod
- mapper.ts - маппинг на VueFlow

### Этап 2: VueFlow компоненты

| Тип ответа       | Нода          | Описание                 |
|------------------|---------------|--------------------------|
| action_proposal  | ProposalNode  | Карточка с предложениями |
| action_executing | ExecutingNode | Выполняемое действие     |
| action_progress  | ProgressNode  | Прогресс бар             |
| action_completed | ResultNode    | Результат                |
| action_error     | ErrorNode     | Ошибка                   |

### Этап 3: UI компоненты

- SearchBar с debounce
- ActionCardsList
- TicketPanel
- PropertiesPanel

### Этап 4: Интеграция

- Подключение к API (A2AClient)
- Обработка ошибок
- Timeout handling

---

## 4. Критерии готовности

- [ ] Парсинг любого типа ответа сервера
- [ ] Валидация через Zod схемы
- [ ] Отображение ProposalNode с subActions
- [ ] Отображение ExecutingNode с progress
- [ ] SearchBar с поиском по экшенам
- [ ] TicketPanel с активными тикетами

---

**Дата:** 2026-02-25
**Статус:** Анализ завершен
