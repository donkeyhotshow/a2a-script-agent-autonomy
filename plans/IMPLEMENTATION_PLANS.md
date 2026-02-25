# Планы доработки - детальная реализация

## План 1: Доработка скриптов автоматизации

### Цель
Довести до рабочего состояния скрипты для работы с симуляциями.

### Задачи

#### 1.1 sim-run-all (запуск всех симуляций)
- Создать `scripts/sim-run-all.ts`
- Сканировать папку simulations/
- Запускать каждую симуляцию последовательно
- Собирать результаты
- Генерировать общий отчет

#### 1.2 sim-validate (валидация по схеме)
- Создать `scripts/sim-validate.ts`
- Использовать существующие схемы из simulations/pilot/schemas.ts
- Валидировать server-response.json
- Выводить ошибки если невалидно

#### 1.3 sim-compare (сравнение с gold standard)
- Создать `scripts/sim-compare.ts`
- Читать response.json и server-response.json
- Сравнивать ключевые поля
- Выводить diff

#### 1.4 sim-report (генерация отчета)
- Создать `scripts/sim-report.ts`
- Собирать статистику по всем симуляциям
- Формировать markdown отчет

### Файлы для создания/изменения:
```
a2a-server/scripts/
├── sim-run-all.ts      # НОВЫЙ
├── sim-validate.ts    # НОВЫЙ  
├── sim-compare.ts     # НОВЫЙ
└── sim-report.ts      # Частично готов
```

---

## План 2: Создание реальных симуляций

### Цель
Создать симуляции для 16 реальных экшенов.

### Приоритеты

#### Фаза 1: analyze-* (5 экшенов)
1. **analyze-full** - полный анализ кодовой базы
   - request.json: task="проанализировать кодовую базу"
   - response.json: proposedActions с analyze-* экшенами

2. **analyze-architecture** - анализ архитектуры
3. **analyze-typescript** - анализ TypeScript
4. **analyze-vue** - анализ Vue компонентов
5. **analyze-laravel** - анализ Laravel кода

#### Фаза 2: generate-* (4 экшена)
6. **generate-crud** - генерация CRUD
7. **generate-controller** - генерация контроллера
8. **generate-model** - генерация модели
9. **generate-migration** - генерация миграции

#### Фаза 3: graph-* (3 экшена)
10. **graph-build** - построение графа
11. **graph-query** - запрос к графу
12. **graph-impact** - анализ зависимостей

#### Фаза 4: hybrid-* (2 экшена)
13. **hybrid-fix** - гибридное исправление
14. **hybrid-refactor** - гибридный рефакторинг

### Структура каждой симуляции:
```
simulations/<action-name>/
├── request.json       # Входные данные
├── response.json      # Gold standard
├── server-response.json  # Результат (генерируется)
├── description.md    # Описание
└── NOTES.md          # Заметки
```

---

## План 3: TypeScript типы для Unified JSON

### Цель
Создать единые TypeScript типы для всех ответов сервера.

### Задачи

#### 3.1 Базовые типы
Создать `a2a-server/src/types/unified.ts`:

```typescript
// Типы ответов
type ResponseType = 
  | 'action_proposal'    // task_request
  | 'action_executing'   // approve_action  
  | 'action_progress'    // step_result (в процессе)
  | 'action_completed'   // step_result (завершено)
  | 'action_error';      // ошибка

// Base Response
interface BaseResponse {
  success: boolean;
  timestamp: string;
}

// Action Proposal
interface ActionProposalResponse extends BaseResponse {
  type: 'action_proposal';
  result: {
    context: ContextBlock;
    proposedActions: Action[];
    fallbackActions?: FallbackAction[];
  };
}

// Action Executing
interface ActionExecutingResponse extends BaseResponse {
  type: 'action_executing';
  result: {
    executingAction: Action;
    nextSteps: Action[];
  };
}
```

#### 3.2 Типы для каждой категории экшенов
- AnalysisResponse
- GenerationResponse
- GraphResponse
- HybridResponse

---

## План 4: Frontend интеграция (Unified JSON UI) - ДЕТАЛЬНЫЙ

### Цель
Создать систему рендеринга UI из JSON ответов сервера на базе VueFlow.

### Источники анализа

1. **a2a-client/web/** - текущий frontend (Vanilla JS + VueFlow)
2. **a2a-client/packages/types/** - базовые TypeScript типы
3. **a2a-client/plans/unified-ui-plan.md** - существующий план (247 строк)
4. **simulations/pilot/schemas.ts** - схемы ответов

### Что уже реализовано (web/js/flow/)
- ✅ A2AClient класс (protocol.js)
- ✅ Custom VueFlow узлы (nodes.js)
- ✅ VueFlow инициализация (index.js)

### Что НЕ реализовано
- ❌ Unified JSON парсер
- ❌ Валидация ответов (Zod)
- ❌ UI для subActions
- ❌ Progress tracking
- ❌ Error handling UI

### Задачи

#### 4.1 Unified JSON Parser (2 дня)
Создать `a2a-client/packages/json/`:
- `src/parser.ts` - основной парсер
- `src/types.ts` - TypeScript типы для ответов
- `src/validator.ts` - валидация через Zod
- `src/mapper.ts` - маппинг на VueFlow

**Типы ответов:**
```typescript
type ResponseType = 
  | 'action_proposal'
  | 'action_executing'
  | 'action_progress'
  | 'action_completed'
  | 'action_error';
```

#### 4.2 VueFlow компоненты (3 дня)
| Тип ответа | Нода | Описание |
|------------|------|----------|
| action_proposal | ProposalNode | Карточка с предложениями |
| action_executing | ExecutingNode | Выполняемое действие |
| action_progress | ProgressNode | Прогресс бар |
| action_completed | ResultNode | Результат |
| action_error | ErrorNode | Ошибка |

#### 4.3 UI компоненты (2 дня)
- SearchBar с debounce
- ActionCardsList
- TicketPanel
- PropertiesPanel

#### 4.4 Интеграция (2 дня)
- Подключение к API (A2AClient)
- WebSocket для real-time
- Error handling

### Критерии готовности
- [ ] Парсинг любого типа ответа сервера
- [ ] Валидация через Zod схемы
- [ ] Отображение ProposalNode с subActions
- [ ] Отображение ExecutingNode с progress
- [ ] Connecting edges
- [ ] SearchBar
- [ ] TicketPanel

### Структура после реализации
```
a2a-client/
├── packages/
│   └── json/           # НОВЫЙ ПАКЕТ
│       ├── src/
│       │   ├── parser.ts
│       │   ├── types.ts
│       │   ├── validator.ts
│       │   └── index.ts
│       └── package.json
└── web/
    └── js/
        └── json/
            └── ui.ts   # UI компоненты
```

---

## Приоритеты реализации

| # | План | Приоритет | Сложность |
|---|------|-----------|-----------|
| 1 | Доработка скриптов | ВЫСОКИЙ | Низкая |
| 2 | Реальные симуляции | ВЫСОКИЙ | Средняя |
| 3 | TypeScript типы | СРЕДНИЙ | Низкая |
| 4 | Frontend интеграция | НИЗКИЙ | Высокая |

---

## План 5: Доработка Half-Finished Action Definitions

### Цель
Довести до рабочего состояния документы .md в `a2a-server/src/actions/definitions/*`, которые содержат только заглушки (пустые TypeScript функции).

### Критерии "half-finished" документа
- Документ содержит структуру SubActions
- TypeScript код содержит только `return { ... }` с пустыми массивами/объектами
- Нет реальной бизнес-логики

### Список half-finished документов

#### Root уровень (1 документ)
| Файл | Описание | SubActions | Статус |
|------|----------|------------|--------|
| dialog.md | AI диалог с управлением тулзами | 5 | Имеет структуру, но не реализовано |

#### analysis/ (9 документов)
| Файл | Описание | SubActions | Статус |
|------|----------|------------|--------|
| analyze-architecture.md | Анализ архитектуры | 2 | Пустые заглушки |
| analyze-full.md | Полный анализ | 5 | Пустые заглушки |
| analyze-laravel.md | Анализ Laravel | 2 | Пустые заглушки |
| analyze-performance.md | Анализ производительности | 3 | Частично (есть комментарии) |
| analyze-security.md | Анализ безопасности | 2 | Пустые заглушки |
| analyze-test.md | Анализ тестов | 2 | Пустые заглушки |
| analyze-typescript.md | Анализ TypeScript | 2 | Пустые заглушки |
| analyze-vue.md | Анализ Vue | 2 | Пустые заглушки |

#### context/ (5 документов)
| Файл | Описание | SubActions | Статус |
|------|----------|------------|--------|
| context-format.md | Форматирование контекста | 2 | Пустые заглушки |
| context-index.md | Построение индекса | 2 | Пустые заглушки |
| context-query.md | Семантический поиск | 3 | Частично (step 1 имеет логику) |
| context-rank.md | Ранжирование | 2 | Пустые заглушки |
| context-scan.md | Сканирование контекста | 2 | Пустые заглушки |

#### fallback/ (3 документа)
| Файл | Описание | SubActions | Статус |
|------|----------|------------|--------|
| ai-analyze.md | AI анализ | 3 | Пустые заглушки |
| ai-fallback.md | Generic LLM обработка | 3 | Пустые заглушки |
| ai-generate.md | AI генерация | 3 | Пустые заглушки |

#### generation/ (7 документов)
| Файл | Описание | SubActions | Статус |
|------|----------|------------|--------|
| generate-controller.md | Генерация контроллера | 2 | Пустые заглушки |
| generate-crud.md | Генерация CRUD | 6 | Пустые заглушки |
| generate-method.md | Генерация метода | 3 | Пустые заглушки |
| generate-migration.md | Генерация миграции | 2 | Пустые заглушки |
| generate-model.md | Генерация модели | 2 | Пустые заглушки |
| generate-test.md | Генерация тестов | 2 | Пустые заглушки |
| generate-view.md | Генерация представления | 2 | Пустые заглушки |

#### graph/ (6 документов)
| Файл | Описание | SubActions | Статус |
|------|----------|------------|--------|
| graph-build.md | Построение графа | 4 | Пустые заглушки |
| graph-extract-entities.md | Извлечение сущностей | 1 | Пустая заглушка |
| graph-extract-relations.md | Извлечение связей | 1 | Пустая заглушка |
| graph-impact.md | Анализ влияния | 2 | Пустые заглушки |
| graph-query.md | Запрос к графу | 2 | Пустые заглушки |
| graph-visualize.md | Визуализация графа | 1 | Пустая заглушка |

#### hybrid/ (4 документа)
| Файл | Описание | SubActions | Статус |
|------|----------|------------|--------|
| hybrid-explain.md | AI объяснение | 2 | Пустые заглушки |
| hybrid-fix.md | Гибридное исправление | 8 | Пустые заглушки |
| hybrid-improve.md | Улучшение кода | 2 | Пустые заглушки |
| hybrid-refactor.md | Гибридный рефакторинг | 2 | Пустые заглушки |

#### fix-vue-imports variants (3 документа)
| Файл | Описание | SubActions | Статус |
|------|----------|------------|--------|
| fix-vue-imports-alternatives.md | Альтернативные пути | 3 | Пустые заглушки |
| fix-vue-imports-batch.md | Пакетная обработка | 4 | Пустые заглушки |
| fix-vue-imports-improvements.md | Улучшения импортов | 2 | Пустые заглушки |

### Итого: 33 half-finished документа

### Приоритеты доработки

| Приоритет | Категория | Количество | Сложность |
|----------|-----------|------------|-----------|
| ВЫСОКИЙ | generation/* | 7 | Средняя |
| ВЫСОКИЙ | graph/* | 6 | Высокая |
| СРЕДНИЙ | hybrid/* | 4 | Высокая |
| СРЕДНИЙ | analysis/* | 9 | Средняя |
| НИЗКИЙ | context/* | 5 | Низкая |
| НИЗКИЙ | fallback/* | 3 | Низкая |

### Файлы для изменения
```
a2a-server/src/actions/definitions/
├── dialog.md
├── fix-vue-imports-alternatives.md
├── fix-vue-imports-batch.md
├── fix-vue-imports-improvements.md
├── analysis/
│   ├── analyze-architecture.md
│   ├── analyze-full.md
│   ├── analyze-laravel.md
│   ├── analyze-performance.md
│   ├── analyze-security.md
│   ├── analyze-test.md
│   ├── analyze-typescript.md
│   └── analyze-vue.md
├── context/
│   ├── context-format.md
│   ├── context-index.md
│   ├── context-query.md
│   ├── context-rank.md
│   └── context-scan.md
├── fallback/
│   ├── ai-analyze.md
│   ├── ai-fallback.md
│   └── ai-generate.md
├── generation/
│   ├── generate-controller.md
│   ├── generate-crud.md
│   ├── generate-method.md
│   ├── generate-migration.md
│   ├── generate-model.md
│   ├── generate-test.md
│   └── generate-view.md
├── graph/
│   ├── graph-build.md
│   ├── graph-extract-entities.md
│   ├── graph-extract-relations.md
│   ├── graph-impact.md
│   ├── graph-query.md
│   └── graph-visualize.md
└── hybrid/
    ├── hybrid-explain.md
    ├── hybrid-fix.md
    ├── hybrid-improve.md
    └── hybrid-refactor.md
```

---

**Дата:** 2026-02-25
**Обновлено:** 2026-02-26
