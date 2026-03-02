# План: Types (a2a-server)

## Текущее состояние

### Что делает модуль

**Types** ([`a2a-server/src/types/`](a2a-server/src/types)) — центральный реестр TypeScript типов для всего приложения.
Содержит определения сущностей, протоколов A2A, сообщений, ошибок и бизнес-логики.

#### Текущие типы:

1. **[`index.ts`](a2a-server/src/types/index.ts:1)** — Главный экспорт и A2A Protocol типы
    - Context Block Types: [`ContextBlock`](a2a-server/src/types/index.ts:7), [
      `Task`](a2a-server/src/types/index.ts:19), [`TaskType`](a2a-server/src/types/index.ts:27), [
      `TaskStatus`](a2a-server/src/types/index.ts:29)
    - File Block Types: [`FileBlock`](a2a-server/src/types/index.ts:42), [
      `FileBlockRequest`](a2a-server/src/types/index.ts:49)
    - Message Types: [`ClientMessage`](a2a-server/src/types/index.ts:59), [
      `ServerMessage`](a2a-server/src/types/index.ts:64)
    - Search Types: [`SearchQuery`](a2a-server/src/types/index.ts:89), [
      `SearchResult`](a2a-server/src/types/index.ts:109), [`SearchMatch`](a2a-server/src/types/index.ts:116)
    - API Types: [`ApiResponse`](a2a-server/src/types/index.ts:141), [`ApiError`](a2a-server/src/types/index.ts:147), [
      `PaginatedResponse`](a2a-server/src/types/index.ts:153)
    - Architectural Feature: [`ArchitecturalFeature`](a2a-server/src/types/index.ts:167)
    - Request API Result: [`RequestContextBlock`](a2a-server/src/types/index.ts:183), [
      `RequestApiResult`](a2a-server/src/types/index.ts:204)

2. **[`entity.types.ts`](a2a-server/src/types/entity.types.ts:1)** — Типы для Knowledge Graph
    - Entity Types: [`EntityTypeName`](a2a-server/src/types/entity.types.ts:7), [
      `RelationTypeName`](a2a-server/src/types/entity.types.ts:23)
    - Entity: [`RecognizedEntity`](a2a-server/src/types/entity.types.ts:40), [
      `EntityMetadata`](a2a-server/src/types/entity.types.ts:53)
    - Relation: [`RecognizedRelation`](a2a-server/src/types/entity.types.ts:110), [
      `RelationMetadata`](a2a-server/src/types/entity.types.ts:123)
    - Sub-types: [`ModelRelation`](a2a-server/src/types/entity.types.ts:81), [
      `ControllerMethod`](a2a-server/src/types/entity.types.ts:90), [
      `VueProp`](a2a-server/src/types/entity.types.ts:100)
    - Result Types: [`RecognitionResult`](a2a-server/src/types/entity.types.ts:132), [
      `CodeBlock`](a2a-server/src/types/entity.types.ts:141)

3. **[`knowledge.types.ts`](a2a-server/src/types/knowledge.types.ts:1)** — Типы для нейронов и вопросов
    - [`BuiltQuestion`](a2a-server/src/types/knowledge.types.ts:3)
    - Neuron Types: [`NeuronCategory`](a2a-server/src/types/knowledge.types.ts:7), [
      `NeuronAction`](a2a-server/src/types/knowledge.types.ts:20), [
      `Neuron`](a2a-server/src/types/knowledge.types.ts:29)

4. **[`errors.ts`](a2a-server/src/types/errors.ts:1)** — Ошибки приложения
    - [`AppError`](a2a-server/src/types/errors.ts:6) — базовый класс ошибок

#### Архитектура:

- Centralized type definitions без бизнес-логики
- Type-only модули (без runtime overhead)
- Иерархическая структура: Protocol → Entity → Knowledge
- Tight coupling с Prisma schema (entity types)
- Используются по всему приложению (controllers, services, middleware)

---

## Возможности для улучшения

### 1. Entity Types (entity.types.ts)

**Текущее:** Базовые типы для Model, Controller, Service, Vue Component

**Предложения:**

- [ ] Расширенные типы для новых сущностей (API Resource, Migration, Seeder, Job, Listener, Observer)
- [ ] Generic Entity interface с discriminated unions
- [ ] Builder pattern для создания entity instances
- [ ] Zod schemas для runtime validation
- [ ] Type guards для type narrowing
- [ ] Валидация связей (relation validation)

### 2. Knowledge Types (knowledge.types.ts)

**Текущее:** Базовые типы для нейронов и действий

**Предложения:**

- [ ] Generic Neuron interface с variadic actions
- [ ] NeuronResult type для возвращаемых данных
- [ ] NeuronConfig type для конфигурации
- [ ] Dependency resolution types
- [ ] Trigger match result types
- [ ] Action execution result types

### 3. Protocol Types (index.ts)

**Текущее:** A2A Protocol message types

**Предложения:**

- [ ] Discriminated unions для Message types
- [ ] Generic Request/Response types
- [ ] Streaming event types
- [ ] Pagination types с cursor support
- [ ] Error code enum (вместо строк)
- [ ] Union types для status/progress

### 4. Error Types

**Текущее:** Базовый AppError класс

**Предложения:**

- [ ] Иерархия ошибок (ValidationError, AuthError, NotFoundError, etc.)
- [ ] Error codes enum
- [ ] Error factory functions
- [ ] Error serialization/deserialization
- [ ] Error context types

### 5. Type Utilities

**Предложения:**

- [ ] Type guards (isEntity, isNeuron, isTask)
- [ ] Type mappers (DTO to Entity, Entity to DTO)
- [ ] Deep partial types
- [ ] Readonly types
- [ ] Nullable types
- [ ] Type-safe enums

---

## API / Типы

### Entity Types

| Интерфейс            | Описание                | Свойства                                                                                                                 |
|----------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------|
| `EntityTypeName`     | Типы сущностей          | MODEL, CONTROLLER, SERVICE, REPOSITORY, MIDDLEWARE, VUE_COMPONENT, COMPOSABLE, PHP, JS, CONFIG, REQUEST, VUE_PAGE, OTHER |
| `RelationTypeName`   | Типы связей             | USES, CREATES, VALIDATES, HANDLES, CALLS, EXTENDS, IMPLEMENTS, IMPORTS, RENDERS, BELONGS_TO, HAS_MANY, HAS_ONE           |
| `RecognizedEntity`   | Распознанная сущность   | id, type, name, path, lineStart?, lineEnd?, metadata?                                                                    |
| `RecognizedRelation` | Связь между сущностями  | id, fromPath, toPath?, fromId?, toId?, type, metadata?                                                                   |
| `RecognitionResult`  | Результат распознавания | entities, relations, errors?                                                                                             |
| `CodeBlock`          | Блок кода для анализа   | path, content                                                                                                            |

### Knowledge Types

| Интерфейс        | Описание           | Свойства                                                                                                                                                          |
|------------------|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `NeuronCategory` | Категория нейрона  | custom_pattern, framework, directory_structure, naming_convention, task_analysis, context_gathering, file_management, code_analysis, generation, external_ai      |
| `NeuronAction`   | Действие нейрона   | {type: 'inject', target: string} \| {type: 'request_files', items: string[]} \| {type: 'analyze'} \| {type: 'classify'} \| {type: 'collect'} \| {type: 'trigger'} |
| `Neuron`         | Нейрон             | id, name, category, triggers, knowledge, actions?, dependsOn?, conflictsWith?, triggersMode?, triggersRegex?, priority?                                           |
| `BuiltQuestion`  | Построенный вопрос | question                                                                                                                                                          |

### Protocol Types

| Интерфейс          | Описание              | Свойства                                                                                                          |
|--------------------|-----------------------|-------------------------------------------------------------------------------------------------------------------|
| `ContextBlock`     | Блок контекста A2A    | version, session_id, new_task?, architectural_features?, continue?, tasks?, request_files?, confirm?, errors?     |
| `Task`             | Задача                | id, type, status, target?, progress?                                                                              |
| `ClientMessage`    | Сообщение от клиента  | context, files?                                                                                                   |
| `ServerMessage`    | Ответ сервера         | context, files?, message?, action?                                                                                |
| `SearchQuery`      | Поисковый запрос      | query, filters?, options?                                                                                         |
| `SearchResult`     | Результат поиска      | results, total, query_time_ms, algorithm_used                                                                     |
| `RequestApiResult` | Результат Request API | outcome, message?, context?, questions?, missing?, graph_stats?, activated_neuron_ids?, injected_content?, error? |

### Error Types

| Интерфейс  | Описание             | Свойства                            |
|------------|----------------------|-------------------------------------|
| `AppError` | Базовый класс ошибок | code, message, statusCode, details? |

---

## Зависимости

### Внешние пакеты

| Пакет | Версия | Назначение                 |
|-------|--------|----------------------------|
| zod   | ^3.x   | Runtime validation schemas |

### Внутренние модули

| Модуль      | Путь                                                                            | Назначение                           |
|-------------|---------------------------------------------------------------------------------|--------------------------------------|
| config      | [`config/index.ts`](a2a-server/src/config/index.ts)                             | Конфигурация приложения              |
| services    | [`services/`](a2a-server/src/services)                                          | Используют типы для DTO              |
| controllers | [`controllers/`](a2a-server/src/controllers)                                    | Используют типы для request/response |
| neurons     | [`neurons/`](a2a-server/src/neurons)                                            | Используют Neuron типы               |
| knowledge   | [`services/knowledge.service.ts`](a2a-server/src/services/knowledge.service.ts) | Graph типизация                      |

### Prisma Schema

Типы Entity и Relation синхронизированы с Prisma schema:

- [`EntityType`](a2a-server/prisma/schema.prisma) enum
- [`RelationType`](a2a-server/prisma/schema.prisma) enum
- [`Entity`](a2a-server/prisma/schema.prisma) model
- [`Relation`](a2a-server/prisma/schema.prisma) model

---

## План развития

### Фаза 1: Расширение Entity Types (приоритет: средний)

1. **Новые Entity Types** (приоритет: средний)
    - [ ] API_RESOURCE — API endpoints/resources
    - [ ] MIGRATION — Database migrations
    - [ ] SEEDER — Database seeders
    - [ ] JOB — Queue jobs
    - [ ] LISTENER — Event listeners
    - [ ] OBSERVER — Model observers
    - [ ] MIDDLEWARE — HTTP middleware
    - [ ] CONFIG — Configuration files

2. **Type Guards** (приоритет: средний)
    - [x] `isRecognizedEntity(value)` — проверка типа сущности
    - [x] `isRecognizedRelation(value)` — проверка типа связи
    - [x] `isEntityTypeName(value)` — проверка типа EntityTypeName
    - [x] `isRelationTypeName(value)` — проверка типа RelationTypeName

3. **Validation Schemas** (приоритет: низкий)
    - [ ] Zod schemas для Entity
    - [ ] Zod schemas для Relation
    - [ ] Zod schemas для RecognitionResult

### Фаза 2: Улучшение Knowledge Types (приоритет: средний)

4. **Neuron Types** (приоритет: средний)
    - [ ] Generic Neuron interface с extends
    - [ ] NeuronResult<T> generic type
    - [ ] NeuronConfig interface
    - [ ] NeuronExecutionContext type

5. **Action Types** (приоритет: низкий)
    - [ ] ActionResult type
    - [ ] ActionExecutionStatus type
    - [ ] ActionChain type для последовательных действий

6. **Trigger Types** (приоритет: низкий)
    - [ ] TriggerMatchResult type
    - [ ] TriggerContext type
    - [ ] TriggerEvaluationResult type

### Фаза 3: Protocol Types (приоритет: высокий)

7. **Discriminated Unions** (приоритет: высокий)
    - [ ] ClientMessage с discriminated union (context, files)
    - [ ] ServerMessage с discriminated union (message, action, files)
    - [ ] TaskStatusDiscriminated union

8. **Error Types** (приоритет: средний)
    - [ ] ErrorCode enum
    - [ ] Иерархия ошибок (extends AppError)
    - [ ] ValidationError, AuthError, NotFoundError, DatabaseError
    - [ ] Error factory functions

9. **API Response Types** (приоритет: средний)
    - [ ] Generic ApiResult<T> type
    - [ ] PaginatedResult<T> с cursor
    - [ ] StreamingResponse type

### Фаза 4: Type Utilities (приоритет: низкий)

10. **Utility Types** (приоритет: низкий)
    - [ ] DeepPartial<T>
    - [ ] DeepReadonly<T>
    - [ ] Nullable<T>
    - [ ] Maybe<T>
    - [ ] StrictExtract<T, U>

11. **Type Mappers** (приоритет: низкий)
    - [ ] EntityToDto<T>
    - [ ] DtoToEntity<T>
    - [ ] PrismaEntityToGraphEntity<T>

---

## Метрики для мониторинга

- Количество типов в модуле
- Количество TypeScript errors в проекте
- Type coverage (процент типизированного кода)
- Время компиляции TypeScript
- Использование `any` типов (должно уменьшаться)
- Количество type guards
- Количество Zod schemas

---

## Риски и ограничения

1. **Tight coupling с Prisma** — изменения в Prisma schema требуют синхронизации типов
2. **No runtime validation** — типы только для compile-time, нужны Zod схемы
3. **Missing type guards** — нет защиты от неправильного использования типов
4. **Incomplete error hierarchy** — только базовый AppError класс
5. **No discriminator в union types** — сложнее безопасно narrowing
6. **Duplicate types** — возможно дублирование типов в разных модулях

---

## Связанные файлы

- [`a2a-server/src/types/index.ts`](a2a-server/src/types/index.ts) — Основные типы
- [`a2a-server/src/types/entity.types.ts`](a2a-server/src/types/entity.types.ts) — Типы сущностей
- [`a2a-server/src/types/knowledge.types.ts`](a2a-server/src/types/knowledge.types.ts) — Типы знаний
- [`a2a-server/src/types/errors.ts`](a2a-server/src/types/errors.ts) — Типы ошибок
- [`a2a-server/prisma/schema.prisma`](a2a-server/prisma/schema.prisma) — Prisma schema (источник истины для
  Entity/Relation)
- [`a2a-server/src/services/knowledge.service.ts`](a2a-server/src/services/knowledge.service.ts) — Использует
  Entity/Relation типы
