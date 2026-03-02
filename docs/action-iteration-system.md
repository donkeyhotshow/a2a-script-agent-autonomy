# План: Система итеративных Actions на основе MD файлов

> **Относится к:** a2a-server (actions)

## Контекст

**Текущее состояние:**

- Есть симуляции итеративного обмена в `simulation-true/` (JSON формат)
- MD файлы actions: [`a2a-server/src/actions/definitions/`](a2a-server/src/actions/definitions/) (
  оглавление: [definitions/README.md](a2a-server/src/actions/definitions/README.md))

**Цель:**
Создать единую систему, где MD файлы определяют структуру action с итеративными шагами, а система парсит их и выполняет.

---

## Этапы реализации

### Этап 1: Новый формат MD файла для Action

**Задачи:**

1. Разработать структуру MD файла с поддержкой:
    - Основного описания action (метаданные)
    - Списка sub-actions (итеративные шаги)
    - DSL определений для каждого шага
    - Контекста выполнения (aliases, patterns)

**Предлагаемая структура MD файла:**

```markdown
# action-id

## Metadata
- description: "Краткое описание"
- priority: 10
- context: { framework, build tool, aliases }

## Sub-actions (в порядке выполнения)

### 1. step-id-1
**Input:** none
**Output:** result_type
**DSL:** script-name

Описание шага.

### 2. step-id-2  
**Input:** result_type от step-1
**Output:** result_type
**DSL:** script-name

Описание шага.

## Context
- Framework: Vue 3
- Build tool: Vite
- Aliases: @ -> resources/js
```

**Файлы:** парсер — [action-parser.ts](a2a-server/src/actions/action-parser.ts),
реестр — [action-registry.ts](a2a-server/src/actions/action-registry.ts),
definitions — [definitions/README.md](a2a-server/src/actions/definitions/README.md)

---

### Этап 2: Парсер MD файлов

**Задачи:**

- [ ] Создать TypeScript структуры для представления Action
- [ ] Реализовать парсер, который извлекает из MD:
    - ID, title, description
    - Sub-actions с их порядком
    - DSL определения
    - Контекст

**Структуры данных:**

```typescript
interface ActionDefinition {
  id: string;
  title: string;
  description: string;
  priority: number;
  context: ActionContext;
  subActions: SubAction[];
}

interface SubAction {
  id: string;
  title: string;
  description: string;
  priority: number;
  input: string;      // что ожидает на вход
  output: string;    // что возвращает
  dsl: {
    script: string;  // имя скрипта
    input: object;   // параметры
  };
}

interface ActionContext {
  framework?: string;
  buildTool?: string;
  aliases?: Record<string, string>;
}
```

---

### Этап 3: Action Registry

**Задачи:**

1. Создать сервис для загрузки и кэширования action定义 из MD файлов
2. Реализовать поиск action по семантике (как в симуляции - matchScore)
3. Добавить возможность hot-reload при изменении MD файлов

**API:**

```typescript
class ActionRegistry {
  // Загрузить все actions из директории
  async loadFromDirectory(path: string): Promise<void>;
  
  // Найти подходящий action по описанию задачи
  findAction(taskDescription: string): ActionMatch[];
  
  // Получить action по ID
  getAction(id: string): ActionDefinition | null;
}
```

---

### Этап 4: Интеграция с фазовой машиной

**Задачи:**

1. Создать новую фазу `action_iterative` или расширить существующую `action`
2. Интегрировать ActionRegistry в request-processor
3. Обрабатывать переходы между шагами (sub-actions)

**Поток:**

```
task_request → find_action → approve_action → execute_step → step_result → execute_next → ... → completed
```

---

### Этап 5: Система выполнения шагов

**Задачи:**

1. Создать ActionExecutor, который:
    - Принимает SubAction и входные данные
    - Выполняет соответствующий скрипт/neuron
    - Возвращает результат для следующего шага

2. Поддержка разных типов шагов:
    - `script` - вызов скрипта из external-ai-hub
    - `neuron` - вызов neuron напрямую
    - `http` - внешний API вызов

```typescript
class ActionExecutor {
  async executeStep(
    subAction: SubAction, 
    input: unknown
  ): Promise<StepResult>;
    
  // Цепочка выполнения
  async executeAction(
    action: ActionDefinition,
    initialInput: unknown
  ): Promise<ActionResult>;
}
```

---

### Этап 6: Формирование ответов (по формату симуляции)

**Задачи:**

1. Реализовать формирование response.json по формату из simulation-true:
    - `outcome`: action_proposal → action_executing → completed
    - `executingAction`: текущий шаг
    - `nextSteps`: оставшиеся шаги
    - `history`: история выполненных

2. Обработка различных исходов:
    - Успешное выполнение всех шагов
    - Ошибка на каком-то шаге
    - Требование подтверждения от пользователя
    - Запрос дополнительных файлов

---

## Архитектура системы

```mermaid
graph TD
    A[Client Request] --> B[Request Processor]
    B --> C[Action Registry]
    C --> D{Found Action?}
    D -dsdsdsddsdsdssdsddfsFEaefefwerwhjbkbbkhbk,hb,khbk,hbjhbjhhb,jhb,jhb,jhb,jhb,jhb,jhbj,hbjhbj,hb,jhv,jhvkhbkjbkjn,mn bkjlkmn nbvhbkjn mbnvbhkjn bn bnm bj]
    D -->|No| F[Fallback: LLM generation]
    E --> G[Action Executor]
    G --> H[Execute Step 1]
    H --> I{Step Result}
    I --> J[Update History]
    J --> K{More Steps?}
    K -->|Yes| H
    K -->|No| L[Response to Client]
    F --> L
```

---

## Файлы для модификации/создания

### Новые файлы:

- `a2a-server/src/actions/action-parser.ts` - парсер MD
- `a2a-server/src/actions/action-registry.ts` - реестр actions
- `a2a-server/src/actions/action-executor.ts` - исполнитель шагов
- `a2a-server/src/actions/types.ts` - типы для action системы

### Модифицируемые файлы:

- `a2a-server/src/services/request-processor.service.ts` - интеграция
- `a2a-server/src/protocol/message-builder.ts` - формирование response

---

## Пример работы

**Вход (от клиента):**

```json
{
  "action": "task_request",
  "task": "исправить импорты в vue компонентах"
}
```

**Система:**

1. Парсит MD файл `fix-vue-imports.md`
2. Находит sub-actions: detect → resolve → apply → cleanup
3. Выполняет первый шаг
4. Возвращает response с executingAction

**Выход (к клиенту):**

```json
{
  "outcome": "action_executing",
  "executingAction": { "actionId": "vue-import-detect", ... },
  "nextSteps": [...]
}
```

---

## Следующие шаги

1. Утвердить формат MD файла
2. Начать реализацию парсера (Этап 2)
3. Создать тестовый action для проверки системы

---

**Дата:** 2026-02-24
**Статус:** Черновик для обсуждения
