# Flow: Graph & Requests — полный отчёт

**Что → Куда → Зачем → Почему → Когда**

**Индекс:** [docs/README.md](README.md) | **Протокол:** [a2a-client/docs/requirements.md](../a2a-client/docs/requirements.md) | **ADR:** [adr/](adr/)

---

## 1. Схема потока (обзор)

```
Client                    API (Express)              RequestService (Prisma)     RequestProcessor (timer)     GraphStore (in-memory)
   │                              │                              │                              │
   │  POST /requests              │                              │                              │
   │  {context, codeBlocks}                                       │                              │
   │ ──────────────────────────► │  create()                    │                              │
   │                              │ ──────────────────────────► │  INSERT requests              │
   │                              │                              │                              │
   │  201 {promiseId}              │                              │                              │
   │ ◄────────────────────────── │                              │                              │
   │                              │                              │                              │
   │  GET /requests/:id/result     │                              │                              │
   │ ──────────────────────────► │  getResult()                 │                              │
   │                              │ ──────────────────────────► │  SELECT                      │
   │  200 {result} or 400 NOT_READY│                              │                              │
   │ ◄────────────────────────── │                              │                              │
   │                              │                              │                              │
   │                              │              [every 5s]      │  getNextPending()             │
   │                              │                              │ ◄───────────────────────────│
   │                              │                              │  UPDATE status=processing     │
   │                              │                              │                              │
   │                              │                              │  recognizeEntitiesBatch()    │
   │                              │                              │  buildAndStoreGraph()         │
   │                              │                              │ ────────────────────────────► │  Map<project_path, StoredGraph>
   │                              │                              │                              │
   │                              │                              │  updateStatus(completed)      │
   │                              │                              │ ──────────────────────────► │  UPDATE result, status
```

---

## 2. Компоненты

### 2.1 API — `requests.routes.ts`

| Endpoint | Метод | Что | Куда | Зачем |
|----------|-------|-----|------|-------|
| `POST /api/v1/requests` | POST | `context` (new_task, tasks), `codeBlocks` (path+content), `priority` | `requestService.create()` | Создать запрос, вернуть `promiseId` для polling |
| `GET /api/v1/requests/:promiseId/status` | GET | — | `requestService.getStatus()` | Быстрая проверка статуса (pending/processing/completed/failed) |
| `GET /api/v1/requests/:promiseId/result` | GET | — | `requestService.getResult()` | Получить результат (только если completed/failed) |
| `DELETE /api/v1/requests/:promiseId` | DELETE | — | `requestService.cancel()` | Отменить pending |
| `DELETE /api/v1/requests/queue/pending` | DELETE | — | `requestService.cancelAllPending()` | Очистить очередь |
| `GET /api/v1/requests/queue/stats` | GET | — | `requestService.getQueueLength()` | Кол-во pending |

**Почему async:** обработка может занимать время; клиент не держит соединение, а опрашивает по `promiseId`.

---

### 2.2 RequestService — `request.service.ts`

| Метод | Что | Куда | Зачем |
|-------|-----|------|-------|
| `create()` | `clientId`, `context`, `message`, `codeBlocks`, `priority` | PostgreSQL `requests` | Сохранить запрос, вернуть `promiseId` (cuid) |
| `getStatus()` | `promiseId` | SELECT status, dates | Polling без полного результата |
| `getResult()` | `promiseId` | SELECT * | Полный результат для completed/failed |
| `updateStatus()` | `promiseId`, status, result?, error? | UPDATE requests | Переход pending→processing→completed/failed |
| `getNextPending()` | — | SELECT ... FOR UPDATE SKIP LOCKED | Взять один pending (по priority DESC, createdAt ASC) |
| `cancel()` / `cancelAllPending()` | — | UPDATE status=cancelled | Отмена |

**Почему FOR UPDATE SKIP LOCKED:** один запрос обрабатывает только один воркер; при нескольких инстансах — без блокировок.

---

### 2.3 RequestProcessor — `request-processor.service.ts`

**Когда:** при старте сервера (`index.ts`), каждые 5 сек (config: `requestProcessorIntervalMs`).

**Цикл `tick()`:**
1. `getNextPending()` — взять один pending
2. Если пусто → return
3. `project_path` = context.project_path (путь к проекту на клиенте)
4. **Если есть codeBlocks и project_path** → заполнить граф:
   - `recognizeEntitiesBatch(codeBlocks)` → сущности
   - `getGraph(project_path)` → существующие
   - `mergeEntitiesById(existing, new)` → объединение
   - `buildAndStoreGraph(project_path, merged)` → сохранить
5. **Если граф неполный** → `updateStatus(completed, {outcome: 'graph_incomplete', question})`
6. **Если граф полный** → `updateStatus(completed, {outcome: 'completed'})` (пока placeholder)
7. При ошибке → `updateStatus(failed, error)`, остановить процессор

**Почему не останавливаться на graph_incomplete:** чтобы следующие запросы (с codeBlocks) продолжали обрабатываться.

---

### 2.4 Entity Recognizer — `entity-recognizer.ts`

| Функция | Что | Зачем |
|---------|-----|-------|
| `recognizeEntities(content, path)` | Один файл | Найти model, controller, service, request, vue-component и т.д. по regex |
| `recognizeEntitiesBatch(files)` | Массив `{path, content}` | Обработать все codeBlocks |

**Типы сущностей и связей:** entity-recognizer.ts, relation-mapper.ts

---

### 2.5 Relation Mapper — `relation-mapper.ts`

| Функция | Что | Зачем |
|---------|-----|-------|
| `buildRelationGraph(entities)` | Массив сущностей | Построить связи: uses, extends, implements, has-many, belongs-to, handles, validates, renders |
| `extractRelations(entity, entityMap)` | Одна сущность | Из metadata извлечь связи к другим сущностям |


---

### 2.6 Graph Store — `graph-store.ts`

| Функция | Что | Куда | Зачем |
|---------|-----|------|-------|
| `storeGraph(projectId, entities, relations)` | Сущности + связи | `Map<graph:projectId, StoredGraph>` | In-memory хранилище |
| `getGraph(projectId)` | — | — | Проверка полноты, запросы |
| `buildAndStoreGraph(projectId, entities)` | Сущности | storeGraph(relations из buildRelationGraph) | Одна операция: построить связи и сохранить |
| `deleteGraph(projectId)` | — | — | Очистка |
| `queryEntities`, `findRelatedEntities`, `getEntityDependencies`, … | — | — | Запросы по графу (для нейронов, external AI) |

**Почему in-memory:** быстрый доступ; persistence — отдельно (TODO).

**Ключ графа:** `project_path` (локация на клиенте).

---

### 2.7 Нейроны и Context Handler

| Компонент | Что | Зачем |
|-----------|-----|-------|
| `context-handler.ts` | Обработка root context, активация нейронов | Клиент шлёт new_task → нейроны активируются по триггерам (partial match → подозрение) |
| `context-injector.ts` | @INJECT из activated neurons | Только активированные нейроны; в контекст попадают **данные триггера** (для ре-триггера на след. итерации) |
| `message-builder.ts` | `buildNeuronActivationMessage()` | Сервер возвращает context с `architectural_features` (нейроны) |
| `request_files` в context | Команда клиенту | Сервер просит прислать файлы (верификация) |

---

## 3. Последовательность по времени

| Шаг | Когда | Кто | Действие |
|-----|-------|-----|----------|
| 1 | Старт сервера | `index.ts` | `startRequestProcessor(5000)` |
| 2 | Клиент | POST /requests | Создать запрос, получить promiseId |
| 3 | Каждые 5 сек | RequestProcessor | `tick()` → getNextPending() |
| 4 | Если есть pending | RequestProcessor | UPDATE status=processing |
| 5 | Если есть codeBlocks | RequestProcessor | recognizeEntitiesBatch → merge → buildAndStoreGraph |
| 6 | Проверка | RequestProcessor | isGraphIncomplete(project_path) |
| 7a | Граф пустой | RequestProcessor | updateStatus(completed, graph_incomplete + question) |
| 7b | Граф не пустой | RequestProcessor | updateStatus(completed, outcome) |
| 8 | Клиент | GET /requests/:id/result | Polling до completed/failed |

---

## 4. Критерий «граф неполный»

```ts
!graphKey || !graph || (!graph.entities?.length && !graph.relations?.length) || primaryQuestionType !== 'concept_identity'
```

**Когда:** перед завершением запроса. Если true → возвращаем `graph_incomplete` + question.

**Кейсы:** no project_path, empty graph, codeBlocks без сущностей, только controller (missing_entity_type), entities без relations (missing_relation), orphan entities. Questions и answers → graph_logs.

---

## 5. Итеративный сценарий

→ [AGENTS.md](../AGENTS.md), [adr-hacks/](adr-hacks/)

---

## 6. Request API vs Session Protocol

| Поток | Формат | Использование |
|-------|--------|---------------|
| **Request API** (POST /requests) | `{context: {project_path, new_task: [...]}, codeBlocks?}` → `{outcome, question}`. Полные имена полей. | Polling, AGENTS.md smoke-test |

**TODO:** результат Request API должен возвращать context block для клиента (`tasks`, `request_files`, `architectural_features`), а не только `{outcome, question}`.

---

## 7. Файлы

| Файл | Роль |
|------|------|
| `src/index.ts` | Запуск процессора при старте |
| `src/routes/requests.routes.ts` | API endpoints |
| `src/services/request.service.ts` | CRUD запросов в PostgreSQL |
| `src/services/request-processor.service.ts` | Цикл обработки, заполнение графа |
| `src/knowledge/entity-recognizer.ts` | Извлечение сущностей из кода |
| `src/knowledge/relation-mapper.ts` | Построение связей между сущностями |
| `src/knowledge/graph-store.ts` | In-memory хранилище графа |
| `src/knowledge/context-handler.ts` | Обработка context, активация нейронов |
| `src/knowledge/context-injector.ts` | @INJECT из нейронов в context |
| `src/protocol/message-builder.ts` | Сборка ServerMessage с context block |
| `src/protocol/context-parser.ts` | Валидация ContextBlock, new_task, request_files |
| `prisma/schema.prisma` | Модель Request (id, promiseId, context, message, codeBlocks, result, status) |
