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

---

## План 3: TypeScript типы для Unified JSON

### Цель
Создать единые TypeScript типы для всех ответов сервера.

### Задачи

#### 3.1 Базовые типы
Создать `a2a-server/src/types/unified.ts`:

```
typescript
type ResponseType = 
  | 'action_proposal'
  | 'action_executing'
  | 'action_progress'
  | 'action_completed'
  | 'action_error';
```

#### 3.2 Типы для каждой категории экшенов
- AnalysisResponse
- GenerationResponse
- GraphResponse
- HybridResponse

---

## План 4: Frontend интеграция (Unified JSON UI)

### Цель
Создать систему рендеринга UI из JSON ответов сервера на базе VueFlow.

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

#### 4.1 Unified JSON Parser
Создать `a2a-client/packages/json/`:
- `src/parser.ts` - основной парсер
- `src/types.ts` - TypeScript типы для ответов
- `src/validator.ts` - валидация через Zod
- `src/mapper.ts` - маппинг на VueFlow

#### 4.2 VueFlow компоненты
| Тип ответа | Нода | Описание |
|------------|------|----------|
| action_proposal | ProposalNode | Карточка с предложениями |
| action_executing | ExecutingNode | Выполняемое действие |
| action_progress | ProgressNode | Прогресс бар |
| action_completed | ResultNode | Результат |
| action_error | ErrorNode | Ошибка |

#### 4.3 UI компоненты
- SearchBar с debounce
- ActionCardsList
- TicketPanel
- PropertiesPanel

#### 4.4 Интеграция
- Подключение к API (A2AClient)
- Error handling

### Критерии готовности
- [ ] Парсинг любого типа ответа сервера
- [ ] Валидация через Zod схемы
- [ ] Отображение ProposalNode с subActions
- [ ] Отображение ExecutingNode с progress
- [ ] Connecting edges
- [ ] SearchBar
- [ ] TicketPanel

---

## План 5: Доработка Half-Finished Action Definitions

### Цель
Довести до рабочего состояния документы .md в `a2a-server/src/actions/definitions/*`.

### Приоритеты доработки

| Приоритет | Категория | Количество | Сложность |
|----------|-----------|------------|-----------|
| ВЫСОКИЙ | generation/* | 7 | Средняя |
| ВЫСОКИЙ | graph/* | 6 | Высокая |
| СРЕДНИЙ | hybrid/* | 4 | Высокая |
| СРЕДНИЙ | analysis/* | 9 | Средняя |
| НИЗКИЙ | context/* | 5 | Низкая |
| НИЗКИЙ | fallback/* | 3 | Низкая |

---

**Дата:** 2026-02-25
**Обновлено:** 2026-02-26
