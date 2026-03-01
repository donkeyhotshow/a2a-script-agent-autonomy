# План: Unified JSON Frontend на VueFlow

## Используем VueFlow

**Decision:** Используем [VueFlow](https://vueflow.dev/) для node-based UI

> VueFlow - готовая библиотека для визуальных node-based интерфейсов на Vue 3

## Структура страницы

```
┌─────────────────────────────────────────────────┐
│                    HEADER                        │
│  ┌─────────────────────────────────────────┐   │
│  │              🔍 SEARCH                    │   │
│  │  (ввод запроса)                          │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│                                                 │
│              РЕЗУЛЬТАТЫ ПОИСКА                 │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  📋 action_1   |  Описание...           │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │  📋 action_2   |  Описание...           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ИЛИ (если нет действий):                       │
│                                                 │
│  🤖 AI Агент (доступные алгоритмы)            │
│                                                 │
└─────────────────────────────────────────────────┘
│                                                 │
│              АКТИВНЫЕ ТИКЕТЫ                   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  #123  📋 Action Name    ⏳ Running    │   │
│  │      [лог выполнения]                    │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │  #124  📋 Action Name    ✅ Completed │   │
│  │      [результат]                        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

## User Flow

1. **Пользователь вводит запрос в поиск**
   - Например: "создать файл", "запустить скрипт", "найти код"

2. **Система ищет действия**
   - По названию (action name)
   - По описанию (description)
   - По тегам

3. **Если найдены действия → Показать карточки**
   - Название действия
   - Краткое описание
   - Клик → открыть форму

4. **Если НЕ найдены → AI Agent**
   - Использует существующие алгоритмы (из кода)
   - Предлагает решение
   - Выполняет через агента

5. **После запуска → Тикет**
   - Появляется внизу страницы
   - Статус: ⏳ Running → ✅ Completed / ❌ Failed
   - Логи и результаты

## Компоненты

### 1. Search Bar
- Input с иконкой 🔍
- Debounce при вводе (300ms)
- Поиск по actions registry
- Кнопка "AI" для принудительного AI режима

### 2. Action Cards (результаты поиска)
- Название
- Описание
- Теги
- Кнопка "Run"

### 3. Action Form (модалка)
- Параметры действия
- Конфигурация
- Кнопка "Выполнить"

### 4. Tickets Panel
- Список активных тикетов
- Статус (running/completed/failed)
- Логи в реальном времени
- Результат

## Существующая функциональность (сохраняется)

- ✅ Action Registry (все доступные действия)
- ✅ Agent Algorithms (AI алгоритмы)
- ✅ Promise System (асинхронное выполнение)
- ✅ Promise Viewer (отслеживание статуса)

## API Endpoints (используем существующие)

- `GET /actions` - список действий
- `POST /actions/<id>/execute` - выполнить действие
- `GET /promises/pending` - активные промисы
- `GET /promise/<id>` - статус промиса

## Техническая реализация (VueFlow)

### Установка

```bash
cd a2a-client
npm install @vue-flow/core @vue-flow/background @vue-flow/controls @vue-flow/minimap
```

### Frontend (a2a-client/web/)

```
web/
├── index.html          # Одна страница с VueFlow
├── css/
│   └── flow.css       # Стили для нод
└── js/
    ├── app.js         # Инициализация VueFlow
    ├── nodes.js       # Кастомные ноды
    ├── edges.js       # Connections
    └── protocol.js   # Маппинг ContextBlock → Flow
```

### HTML Структура (VueFlow)

```html
<div id="app">
  <header>
    <div class="search-container">
      <input type="text" id="search-input" placeholder="Что вы хотите сделать?">
    </div>
  </header>
  
  <main>
    <!-- VueFlow Canvas -->
    <div id="flow-canvas"></div>
  </main>
  
  <aside id="properties-panel">
    <h3>Свойства</h3>
    <div id="node-properties"></div>
  </aside>
</div>

<!-- VueFlow -->
<script src="https://unpkg.com/@vue-flow/core/dist/vue-flow.js"></script>
```

## План реализации (VueFlow)

### Этап 1: Базовая структура (2 дня)
```
1.1 Установить VueFlow
1.2 Создать базовую структуру с VueFlow canvas
1.3 Настроить кастомные ноды
1.4 Подключить API /actions
```

### Этап 2: Кастомные ноды (2 дня)
```
2.1 TaskInputNode - ввод задачи
2.2 ActionProposalNode - предложение экшенов
2.3 SubActionNode - под-экшены
2.4 ResultNode - результаты
```

### Этап 3: Интеграция с протоколом (2 дня)
```
3.1 Маппинг ContextBlock → VueFlow nodes
3.2 Обработка proposedActions
3.3 Edge connections между нодами
```

### Этап 4: UI компоненты (1 день)
```
4.1 Панель свойств ноды
4.2 Сайдбар с доступными экшенами
4.3 Поиск по экшенам
```

## Удаляется

- ❌ Отдельные страницы (chat, files, projects)
- ❌ Monaco Editor (или переносим в форму действия)
- ❌ Session-based интерфейс

## Сохраняется

- ✅ Все endpoints
- ✅ Promise System
- ✅ Action Registry
- ✅ Agent Algorithms

## Файлы для изменения (VueFlow)

- `a2a-client/web/index.html` - Основная страница с VueFlow
- `a2a-client/web/js/app.js` - VueFlow инициализация
- `a2a-client/web/js/nodes.js` - Кастомные ноды
- `a2a-client/web/js/edges.js` - Connections
- `a2a-client/web/js/protocol.js` - Маппинг протокола

## Маппинг протокола на VueFlow

| ContextBlock.outcome | VueFlow Node Type | Цвет |
|---------------------|-------------------|------|
| task_request | input | #22c55e (green) |
| action_proposal | default | #eab308 (yellow) |
| action_executing | default | #3b82f6 (blue) |
| step_result | default | #6b7280 (gray) |
| action_complete | output | #22c55e (green) |

## Интеграция с существующими пакетами a2a-client

### Подключаемые пакеты:
- `packages/api-client/` - коммуникация с сервером
- `packages/fs-utils/` - файловые операции
- `packages/rag/` - поиск и индексация
- `packages/script-runner/` - выполнение скриптов

### a2a-client структура:
```
a2a-client/
├── packages/
│   ├── api-client/src/index.ts   # HTTP клиент
│   ├── fs-utils/                # Файловые утилиты
│   └── rag/                     # RAG для поиска
└── web/                         # VueFlow интерфейс
```

## Что еще нужно сделать:

1. **Реализовать VueFlow компонент** - создать реальный код
2. **Интегрировать с api-client** - подключить к серверу
3. **Создать кастомные ноды** - для каждого типа экшенов
4. **Запустить симуляции** - проверить протокол
