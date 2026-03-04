# План доработок a2a-client под новый протокол new-request-flow

## Обзор

Документ описывает необходимые доработки для a2a-client пакетов с целью полного соответствия новому протоколу new-request-flow.

**Источники требований:**
- [`docs/new-request-flow/PROTOCOL.md`](docs/new-request-flow/PROTOCOL.md)
- [`docs/new-request-flow/ARCHITECTURE.md`](docs/new-request-flow/ARCHITECTURE.md)
- [`docs/new-request-flow/SCHEMAS.md`](docs/new-request-flow/SCHEMAS.md)

---

## 1. Выявленные несовместимости

### 1.1 api-client

| № | Проблема | Статус |
|---|----------|--------|
| 1.1.1 | [`invokeFirstTask`](a2a-client/packages/api-client/src/simulation-helpers.ts:185) использует `version: '1.0'` вместо `'2.0'` | ⚠️ Требует исправления |
| 1.1.2 | Отсутствует полная поддержка `context.execution` с полями `action`, `step`, `status`, `progress` | ⚠️ Требует расширения |
| 1.1.3 | Нет обработки `finalResult` в ответах сервера | ⚠️ Требует добавления |
| 1.1.4 | [`buildProtocolContext`](a2a-client/packages/api-client/src/protocol.ts:48) не включает все поля из нового протокола | ⚠️ Требует расширения |
| 1.1.5 | Нет явной поддержки Actions vs AI-Actions разделения | 🔄 Может потребоваться |

### 1.2 fs-utils

| № | Проблема | Статус |
|---|----------|--------|
| 1.2.1 | [`protocol-result.ts`](a2a-client/packages/fs-utils/src/protocol-result.ts) - формат результатов не соответствует action-key shape | ⚠️ Требует проверки |
| 1.2.2 | Нет явной поддержки `context.history` для отслеживания выполнения | 🔄 Может потребоваться |

### 1.3 rag

| № | Проблема | Статус |
|---|----------|--------|
| 1.3.1 | [`protocol-rag-search.ts`](a2a-client/packages/rag/src/protocol-rag-search.ts) - результаты не полностью соответствуют схеме (отсутствуют `matches` с `line_start`, `line_end`, `context_score`) | ⚠️ Требует исправления |
| 1.3.2 | Нет интеграции с `context.execution` для отслеживания шагов | 🔄 Может потребоваться |

### 1.4 script-runner

| № | Проблема | Статус |
|---|----------|--------|
| 1.4.1 | [`index.ts`](a2a-client/packages/script-runner/src/index.ts) - возвращаемый формат `ScriptResult` не соответствует action-key shape | ⚠️ Требует проверки |

---

## 2. Детальный план доработок

### 2.1 api-client - Приоритет: ВЫСОКИЙ

#### 2.1.1 Исправить версию протокола в invokeFirstTask

**Файл:** [`a2a-client/packages/api-client/src/simulation-helpers.ts`](a2a-client/packages/api-client/src/simulation-helpers.ts)

**Изменение:**
```typescript
// Строка ~205: изменить version с '1.0' на '2.0'
context: {
    version: '2.0',  // было '1.0'
    session_id: sessionId,
    new_task: [task]
}
```

#### 2.1.2 Расширить buildProtocolContext

**Файл:** [`a2a-client/packages/api-client/src/protocol.ts`](a2a-client/packages/api-client/src/protocol.ts)

**Добавить поля:**
- `context.history` - массив записей выполнения
- `context.docVirtual` - виртуальный документ
- `context.errors` - ошибки

#### 2.1.3 Добавить поддержку finalResult

**Файлы:**
- [`a2a-client/packages/api-client/src/simulation-helpers.ts`](a2a-client/packages/api-client/src/simulation-helpers.ts)
- [`a2a-client/packages/api-client/src/index.ts`](a2a-client/packages/api-client/src/index.ts)

**Добавить:**
- Тип `FinalResult` 
- Функцию `extractFinalResult(response)`
- Экспорт новых типов

#### 2.1.4 Обновить типы ExecutePayload и ActionResultPayload

**Файл:** [`a2a-client/packages/api-client/src/simulation-helpers.ts`](a2a-client/packages/api-client/src/simulation-helpers.ts)

**Согласовать с [PROTOCOL.md](docs/new-request-flow/PROTOCOL.md#action-key-shape-обязательно):**

| Action | Execute формат | Result формат |
|--------|----------------|---------------|
| script | `{ script: { input, output, code } }` | `{ script: { output?, error? } }` |
| read-file | `{ 'read-file': { path } }` | `{ 'read-file': { path, content?, error? } }` |
| write-file | `{ 'write-file': { path, content } }` | `{ 'write-file': { path, success, error? } }` |
| rag-search | `{ 'rag-search': { query, filters?, options? } }` | `{ 'rag-search': { results[], files[] } }` |
| execute-command | `{ 'execute-command': { command } }` | `{ 'execute-command': { command, exitCode, stdout, stderr } }` |
| form | `{ form: { input[], choices[] } }` | `{ form: { choice?, input? } }` |
| message | `{ message: { content } }` | — (UI only) |

#### 2.1.5 Добавить явную поддержку Actions vs AI-Actions

**Новые функции:**
```typescript
// Определение типа действия из ответа
export function getActionType(response: { context?: { execution?: { action: string } } }): 'action' | 'ai-action' | null

// Проверка, является ли шаг LLM-управляемым
export function isAiActionStep(response: { context?: { execution?: { step: string } } }): boolean

// Получение availableSteps для AI-Actions
export function getAvailableSteps(response: { context?: { availableSteps?: string[] } }): string[]
```

---

### 2.2 fs-utils - Приоритет: СРЕДНИЙ

#### 2.2.1 Проверить и обновить protocol-result.ts

**Файл:** [`a2a-client/packages/fs-utils/src/protocol-result.ts`](a2a-client/packages/fs-utils/src/protocol-result.ts)

**Проверить соответствие:**
```typescript
// Должно быть:
{ result: { 'write-file': { path, success } } }
{ result: { 'read-file': { path, content } } }

// Не:
{ result: { path, success } }  // Без action-key
```

#### 2.2.2 Добавить функции для работы с history

**Новые функции:**
```typescript
// Добавить запись в историю
export function addToHistory(
    context: Record<string, unknown>,
    action: string,
    step: string,
    result?: unknown
): Record<string, unknown>

// Получить историю выполнения
export function getHistory(context: Record<string, unknown>): Array<{
    action: string;
    step: string;
    result?: unknown;
    timestamp: string;
}>
```

---

### 2.3 rag - Приоритет: ВЫСОКИЙ

#### 2.3.1 Обновить RagSearchResultEntry

**Файл:** [`a2a-client/packages/rag/src/protocol-rag-search.ts`](a2a-client/packages/rag/src/protocol-rag-search.ts)

**Изменить интерфейс:**
```typescript
export interface RagSearchResultEntry {
    file: string;           // Обязательно (ранее был optional)
    score: number;
    matches: Array<{
        line_start: number;
        line_end: number;
        content: string;
        highlight: string;
        context_score: number;
    }>;
    metadata?: {
        framework: string;
        type: string;
        last_modified: string;
    };
}
```

#### 2.3.2 Обновить функцию toRagSearchResult

**Изменения:**
- Включить `matches` с полным контекстом
- Добавить `metadata` в результаты
- Сохранить обратную совместимость с текущей схемой

---

### 2.4 script-runner - Приоритет: СРЕДНИЙ

#### 2.4.1 Проверить соответствие result формату

**Файл:** [`a2a-client/packages/script-runner/src/index.ts`](a2a-client/packages/script-runner/src/index.ts)

**Текущий формат:**
```typescript
interface ScriptResult {
    success: boolean;
    data?: unknown;
    error?: string;
    duration_ms: number;
}
```

**Требуемый формат (action-key shape):**
```typescript
// Результат должен быть:
{ script: { output?: unknown; error?: string } }

// Функция для преобразования:
export function toScriptResult(result: ScriptResult): { script: { output?: unknown; error?: string } }
```

---

## 3. Дополнительные доработки (низкий приоритет)

### 3.1 types - Общие типы

**Файл:** [`a2a-client/packages/types`](a2a-client/packages/types)

**Добавить:**
- `ExecutionContext` - тип для `context.execution`
- `HistoryEntry` - тип для `context.history[]`
- `FinalResult` - тип для финального результата

### 3.2 terminal - Терминал

**Файл:** [`a2a-client/packages/terminal`](a2a-client/packages/terminal)

**Проверить:**
- [`command-executor-wrapper.cjs`](a2a-client/packages/terminal/src/command-executor-wrapper.cjs) - соответствие `execute-command` формату

---

## 4. Примеры миграции

### 4.1 Пример вызова с новым протоколом

```typescript
import { 
    invokeFirstTask, 
    sendClientActionResult,
    hasFormChoices,
    getFormChoices,
    isCompleted,
    getFinalResult
} from '@a2a/api-client';

// 1. Начать новую задачу
const firstResult = await invokeFirstTask(client, 'исправить импорты в Vue файлах');
const { context, execute } = firstResult;

// 2. Проверить, есть ли выбор действий (form.choices)
if (hasFormChoices(firstResult)) {
    const choices = getFormChoices(firstResult);
    // Показать UI с выбором
}

// 3. После выбора действия - отправить результат
const choiceResult = await sendClientActionResult(
    client, 
    context, 
    'choice', 
    { choice: 'fix-vue-imports' }
);

// 4. Выполнить действие на клиенте
// (handleExecuteAction из action-handler.ts)

// 5. Отправить результат выполнения
const stepResult = await sendClientActionResult(
    client,
    context,
    'script',
    { output: { broken_imports: [...] } }
);

// 6. Проверить завершение
if (isCompleted(stepResult)) {
    const final = getFinalResult(stepResult);
    // Обработать финальный результат
}
```

---

## 5. Тестирование

### 5.1 Модульные тесты

**Файлы для создания/обновления:**
- `api-client/tests/protocol-v2.test.ts`
- `api-client/tests/action-handlers-v2.test.ts`
- `rag/tests/protocol-rag-search-v2.test.ts`
- `fs-utils/tests/protocol-result-v2.test.ts`

### 5.2 Интеграционные тесты

**Проверить:**
- Полный поток: task → form.choices → choice → execute → result → next → ... → completed
- Обработку ошибок
- Сохранение context между запросами

---

## 6. Чеклист выполнения

- [x] 2.1.1 api-client: Исправить версию протокола в invokeFirstTask
- [x] 2.1.2 api-client: Расширить buildProtocolContext
- [x] 2.1.3 api-client: Добавить поддержку finalResult
- [x] 2.1.4 api-client: Обновить типы ExecutePayload и ActionResultPayload
- [x] 2.1.5 api-client: Добавить явную поддержку Actions vs AI-Actions
- [x] 2.2.1 fs-utils: Проверить и обновить protocol-result.ts (реализовано в api-client)
- [x] 2.2.2 fs-utils: Добавить функции для работы с history (реализовано в api-client)
- [x] 2.3.1 rag: Обновить RagSearchResultEntry (добавлены matches, metadata)
- [x] 2.3.2 rag: Обновить функцию toRagSearchResult
- [x] 2.4.1 script-runner: Проверить соответствие result формату (реализовано в action-handlers)

## 7. Реализованные изменения

### api-client

**Файл:** [`a2a-client/packages/api-client/src/simulation-helpers.ts`](a2a-client/packages/api-client/src/simulation-helpers.ts)
- Исправлена версия протокола с `'1.0'` на `'2.0'` в `invokeFirstTask`
- Добавлены типы `FinalResult`, `HistoryEntry`
- Добавлены функции: `getExecution`, `addToHistory`, `getHistory`
- Добавлены функции для Actions vs AI-Actions: `isAiAction`, `getActionType`, `getAvailableSteps`
- Обновлена функция `isCompleted` для проверки `execution.status`

**Файл:** [`a2a-client/packages/api-client/src/index.ts`](a2a-client/packages/api-client/src/index.ts)
- Экспортированы новые функции и типы

**Файл:** [`a2a-client/packages/api-client/src/action-handlers/command-handler.ts`](a2a-client/packages/api-client/src/action-handlers/command-handler.ts)
- Обновлён формат результата `execute-command`:
  - `exitCode` вместо `success`
  - Убраны лишние поля (`args`, `success`, `error`)

### rag

**Файл:** [`a2a-client/packages/rag/src/protocol-rag-search.ts`](a2a-client/packages/rag/src/protocol-rag-search.ts)
- Обновлён интерфейс `RagSearchResultEntry`:
  - `file` и `path` теперь обязательные
  - Добавлены `matches: RagSearchMatch[]` с `line_start`, `line_end`, `content`, `highlight`, `context_score`
  - Добавлены `metadata?: RagSearchResultMetadata`
- Обновлена функция `toRagSearchResult` для генерации полных результатов

---

## 7. Зависимости между задачами

```
2.1.1 ─┬─► 2.1.2 ─┬─► 2.1.4 ─┬─► 2.1.5
       │          │          │
       └──────────┴──────────┘

2.3.1 ──► 2.3.2

2.1.x (api-client) ──► 2.2.x (fs-utils) ──► 2.3.x (rag)
                                   │
                                   └─► 2.4.x (script-runner)
```

**Рекомендуемый порядок:**
1. api-client (2.1.1 → 2.1.5)
2. fs-utils (2.2.1 → 2.2.2)
3. rag (2.3.1 → 2.3.2)
4. script-runner (2.4.1)
5. Тестирование

---

## 8. Риски и миграция

### 8.1 Обратная совместимость

- Сохранить старые функции как deprecated
- Новые функции должны иметь суффикс `V2` или быть в отдельном экспорте
- Тесты должны покрывать оба формата

### 8.2 Известные риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Разрыв совместимости с существующими симуляциями | Средняя | Высокое | Добавить transitional layer |
| Изменение API rag | Средняя | Среднее | Сохранить старый формат как опцию |
