# План миграции трансформационных схем на сервер

## Обзор

Миграция шаблонов трансформаций из `templates/ai-action-transforms/` в `a2a-server` для использования в AI-Actions (реальных LLM-запросах).

### Что переносим

| Файл | Назначение |
|------|------------|
| `templates/ai-action-transforms/server-transforms-request.json` | Трансформация request.json → request.md для LLM |
| `templates/ai-action-transforms/server-transforms-response.json` | Трансформация response.md → response.json после LLM |

### Операции в схемах

- `copy` — копирование данных между JSONPath
- `set` — установка значения по JSONPath
- `append-to-array` — добавление в массив
- `parse-json-from-md` — извлечение JSON из markdown
- `render-markdown` — рендеринг markdown-шаблона
- `switch` — условная трансформация

---

## Текущее состояние

### Transform Runtime

Transform runtime уже реализован в `a2a-server/src/transform/`:

| Файл | Описание |
|------|----------|
| [`types.ts`](a2a-server/src/transform/types.ts) | Типы для трансформаций |
| [`operations.ts`](a2a-server/src/transform/operations.ts) | Реализация операций |
| [`pipeline.ts`](a2a-server/src/transform/pipeline.ts) | Исполнитель pipeline |
| [`index.ts`](a2a-server/src/transform/index.ts) | Экспорт модуля |

### Использование

| Компонент | Статус | Файл |
|-----------|--------|------|
| `SimulationRequestProcessor` | ✅ Использует | [`simulation-request-processor.ts`](a2a-server/src/services/core/request-processor/simulation-request-processor.ts:16-20) |
| `NeuronRequestProcessor` | ❌ Не использует | [`neuron-request-processor.ts`](a2a-server/src/services/core/request-processor/neuron-request-processor.ts:495-543) |

### Точки интеграции в NeuronRequestProcessor

1. **Строка 495-543**: [`handleAIActions()`](a2a-server/src/services/core/request-processor/neuron-request-processor.ts:495)
   - Возвращает `outcome: 'ai_action_ready'`
   - НЕ вызывает LLM
   - Использует `buildRequestContextBlock()` для формирования контекста

2. **Строка 516-519**: Построение контекста для LLM
   ```typescript
   const contextBlock = buildRequestContextBlock({
       newTask: taskText ? [taskText] : [],
       context: contextManager.getAll(),
   });
   ```

---

## Архитектурные изменения

### До (текущее поведение)

```
User Request
    ↓
NeuronRequestProcessor.handleAIActions()
    ↓
buildRequestContextBlock() - простая сериализация
    ↓
Return 'ai_action_ready' (без вызова LLM)
```

### После (с трансформациями)

```
User Request
    ↓
NeuronRequestProcessor.handleAIActions()
    ↓
[Request Transform]
server-transforms-request.json (из prompts/)
    ↓
request.md (подготовленный промпт для LLM)
    ↓
[LLM Call]
    ↓
response.md (ответ LLM)
    ↓
[Response Transform]
server-transforms-response.json
    ↓
response.json (обработанный результат)
```

---

## План реализации

### Этап 1: Подготовка (Foundation)

**Цель**: Создать инфраструктуру для загрузки и применения трансформаций в NeuronRequestProcessor

#### 1.1 Создать AI-Action Transform Service

**Файл**: `a2a-server/src/services/ai-action-transform.service.ts`

```typescript
// Сервис для управления трансформациями AI-Actions
export class AIActionTransformService {
    // Загрузка трансформаций из prompts/
    async loadTransforms(actionName: string): Promise<{
        request: TransformPipeline | null;
        response: TransformPipeline | null;
    }>;
    
    // Применение request трансформации
    async applyRequestTransform(
        pipeline: TransformPipeline,
        context: RequestContext
    ): Promise<TransformResult>;
    
    // Применение response трансформации
    async applyResponseTransform(
        pipeline: TransformPipeline,
        llmResponse: string,
        context: RequestContext
    ): Promise<TransformResult>;
}
```

#### 1.2 Обновить типы трансформаций

**Файл**: [`a2a-server/src/transform/types.ts`](a2a-server/src/transform/types.ts)

Добавить типы для AI-Action специфичных операций:

```typescript
export interface AIActionTransforms {
    request: TransformPipeline;
    response: TransformPipeline;
}
```

#### 1.3 Добавить функцию renderTemplate

**Файл**: [`a2a-server/src/transform/operations.ts`](a2a-server/src/transform/operations.ts:229)

Обеспечить поддержку template resolution для prompt-ов:

- Замена `{{path}}` на значения из контекста
- Поддержка циклов и условей в шаблонах (опционально)

---

### Этап 2: Интеграция в NeuronRequestProcessor

**Цель**: Интегрировать трансформации в поток обработки AI-Actions

#### 2.1 Модифицировать handleAIActions()

**Файл**: [`a2a-server/src/services/core/request-processor/neuron-request-processor.ts`](a2a-server/src/services/core/request-processor/neuron-request-processor.ts:495)

```typescript
private async handleAIActions(
    promiseId: string,
    phaseMachine: PhaseMachine,
    contextManager: ContextManager,
    taskText: string | null,
    ctx: Record<string, unknown>
): Promise<ProcessResult> {
    const action = ctx['action'] as string | undefined;
    
    // 1. Загрузить трансформации для данного action
    const transformService = this.getTransformService();
    const transforms = await transformService.loadTransforms(action || 'auto-ai');
    
    // 2. Подготовить контекст для request трансформации
    const requestContext = {
        newTask: taskText ? [taskText] : [],
        context: contextManager.getAll(),
        action,
        // Добавить данные из previous results если есть
        result: ctx['result'],
    };
    
    // 3. Применить request трансформацию
    let promptData = requestContext;
    if (transforms.request) {
        const requestResult = await transformService.applyRequestTransform(
            transforms.request,
            requestContext
        );
        promptData = requestResult.output;
    }
    
    // 4. Сгенерировать request.md (или использовать in-memory)
    const requestMarkdown = await this.renderPrompt(promptData);
    
    // 5. Вызвать LLM (новый функционал)
    const llmResponse = await this.callLLM(requestMarkdown);
    
    // 6. Применить response трансформацию
    let responseData;
    if (transforms.response) {
        const responseResult = await transformService.applyResponseTransform(
            transforms.response,
            llmResponse,
            promptData
        );
        responseData = responseResult.output;
    } else {
        responseData = this.parseLLMResponse(llmResponse);
    }
    
    // 7. Вернуть результат
    return {
        outcome: 'completed',
        result: responseData.result,
        execute: responseData.execute,
        context: responseData.context,
    };
}
```

#### 2.2 Добавить LLM вызов

**Файл**: `a2a-server/src/services/llm/llm-client.service.ts` (новый)

```typescript
export class LLMClientService {
    async complete(prompt: string, options: LLMOptions): Promise<string> {
        // Интеграция с AI- провайдером
    }
}
```

#### 2.3 Обновить buildRequestContextBlock()

**Файл**: [`a2a-server/src/protocol/message-builder.ts`](a2a-server/src/protocol/message-builder.ts:79)

Модифицировать для поддержки расширенного формата с `context.execution.step`:

```typescript
export const buildRequestContextBlock = (opts: {
    tasks?: Task[];
    requestFiles?: string[];
    architecturalFeatures?: string[];
    newTask?: string[];
    context?: Record<string, unknown>;
    execution?: {
        step?: string;
        progress?: number;
        action?: string;
    };
}): RequestContextBlock => { ... }
```

---

### Этап 3: Загрузка схем трансформаций

**Цель**: Переместить и адаптировать схемы из templates/

#### 3.1 Создать директорию с transforms

**Путь**: `a2a-server/prompts/transforms/`

```
prompts/
├── auto-ai/
│   ├── request-transform.json
│   └── response-transform.json
├── coder/
│   ├── request-transform.json
│   └── response-transform.json
└── analyze/
    ├── request-transform.json
    └── response-transform.json
```

#### 3.2 Адаптировать схемы

**Файл**: `a2a-server/prompts/transforms/auto-ai/request-transform.json`

```json
{
  "type": "pipeline",
  "steps": [
    {
      "op": "copy",
      "from": "$",
      "to": "$out"
    },
    {
      "op": "append-to-array",
      "to": "$.context.history",
      "value": {
        "role": "user",
        "message": "$.result.message"
      }
    },
    {
      "op": "render-markdown",
      "templateRef": "a2a-server/prompts/auto-ai/request.md",
      "data": "$out",
      "outputFile": "request.md"
    }
  ]
}
```

**Файл**: `a2a-server/prompts/transforms/auto-ai/response-transform.json`

```json
{
  "type": "pipeline",
  "steps": [
    {
      "op": "parse-json-from-md",
      "fromFile": "response.md",
      "jsonPath": "$",
      "to": "$llm"
    },
    {
      "op": "copy",
      "from": "$.context",
      "to": "$.context"
    },
    {
      "op": "set",
      "path": "$.context.execution.step",
      "value": "$.llm.step"
    },
    {
      "op": "append-to-array",
      "to": "$.context.history",
      "value": {
        "role": "assistant",
        "step": "$.llm.step",
        "message": "$.llm.message"
      }
    },
    {
      "op": "set",
      "path": "$.execute",
      "value": "$.llm.execute"
    },
    {
      "op": "set",
      "path": "$.result.completed",
      "value": "$.llm.completed"
    }
  ]
}
```

---

### Этап 4: Обратная совместимость

**Цель**: Обеспечить совместимость со старым синтаксисом

#### 4.1 Расширить backwards-compat.ts

**Файл**: [`a2a-server/src/protocol/versioning/backwards-compat.ts`](a2a-server/src/protocol/versioning/backwards-compat.ts:64)

Добавить функции определения формата:

```typescript
// Определить, является ли запрос AI-Action (канонический формат)
export function isAIActionFormat(data: unknown): boolean {
    const ctx = data as Record<string, unknown>;
    // Канонический: execute.form.choices, context.execution.step
    return !!(ctx['execute'] && ctx['context'] && ctx['context']['execution']);
}

// Определить, является ли запрос legacy
export function isLegacyActionFormat(data: unknown): boolean {
    const ctx = data as Record<string, unknown>;
    // Legacy: actions[], proposedActions, subActions, executingAction, dslScript
    return !!(ctx['actions'] || ctx['proposedActions'] || ctx['dslScript']);
}
```

#### 4.2 Добавить Transform Router

**Файл**: `a2a-server/src/services/transform/transform-router.service.ts`

Выбирает правильную трансформацию на основе формата запроса:

```typescript
export class TransformRouter {
    selectTransform(request: RequestContext): TransformPipeline | null {
        if (isAIActionFormat(request)) {
            return this.loadAIActionTransform(request.action);
        }
        
        if (isLegacyActionFormat(request)) {
            return this.applyLegacyTransform(request);
        }
        
        // Fallback - без трансформаций
        return null;
    }
}
```

---

### Этап 5: Тестирование

#### 5.1 Модульные тесты

**Файл**: `a2a-server/tests/unit/ai-action-transform.test.ts`

```typescript
describe('AIActionTransformService', () => {
    it('should load transforms for auto-ai action');
    it('should apply request transforms correctly');
    it('should apply response transforms correctly');
    it('should handle missing transforms gracefully');
});
```

#### 5.2 Интеграционные тесты

**Файл**: `a2a-server/tests/integration/ai-action-flow.test.ts`

```typescript
describe('AI-Action Flow', () => {
    it('should complete full transform pipeline');
    it('should work with legacy format');
    it('should handle errors in transforms');
});
```

#### 5.3 E2E тесты

```bash
# Тест полного потока
npm run test:e2e -- --test=ai-action-flow

# Тест с реальным LLM
SKIP_AUTH=1 npm run test:e2e -- --test=ai-action-llm
```

---

## Файлы для изменения

### Новые файлы

| Файл | Описание |
|------|----------|
| `a2a-server/src/services/ai-action-transform.service.ts` | Сервис трансформаций |
| `a2a-server/src/services/llm/llm-client.service.ts` | LLM клиент |
| `a2a-server/src/services/transform/transform-router.service.ts` | Роутер трансформаций |
| `a2a-server/prompts/transforms/auto-ai/request-transform.json` | Request трансформация |
| `a2a-server/prompts/transforms/auto-ai/response-transform.json` | Response трансформация |
| `a2a-server/tests/unit/ai-action-transform.test.ts` | Тесты |
| `a2a-server/tests/integration/ai-action-flow.test.ts` | Интеграционные тесты |

### Изменяемые файлы

| Файл | Изменения |
|------|----------|
| [`neuron-request-processor.ts`](a2a-server/src/services/core/request-processor/neuron-request-processor.ts) | Интеграция трансформаций в handleAIActions() |
| [`backwards-compat.ts`](a2a-server/src/protocol/versioning/backwards-compat.ts) | Добавить isAIActionFormat() |
| [`message-builder.ts`](a2a-server/src/protocol/message-builder.ts) | Расширить buildRequestContextBlock() |
| [`transform/types.ts`](a2a-server/src/transform/types.ts) | Добавить AIActionTransforms |
| [`transform/operations.ts`](a2a-server/src/transform/operations.ts) | Улучшить render-markdown |

---

## Зависимости

### Внешние

- **AI Integration**: LLM провайдер для вызова модели
- **Prompt Storage**: Хранилище промптов (file system)

### Внутренние

- **Transform Runtime**: [`a2a-server/src/transform/`](a2a-server/src/transform/) — уже есть
- **Backwards Compat**: [`a2a-server/src/protocol/versioning/backwards-compat.ts`](a2a-server/src/protocol/versioning/backwards-compat.ts) — уже есть

---

## Приоритеты реализации

| Приоритет | Задача | Сложность |
|-----------|--------|----------|
| 1 | Создать AIActionTransformService | Средняя |
| 2 | Интегрировать в handleAIActions() | Высокая |
| 3 | Добавить LLM клиент | Средняя |
| 4 | Переместить трансформации в prompts/ | Низкая |
| 5 | Обратная совместимость | Средняя |
| 6 | Тестирование | Высокая |

---

## Риски и решения

| Риск | Решение |
|------|----------|
| LLM может вернуть невалидный JSON | Добавить retry логику и fallback парсинг |
| Трансформации могут упасть | Graceful degradation - использовать базовый формат |
| Большой контекст для LLM | Лимитировать размер history в трансформации |

---

## Метрики успеха

- [ ] NeuronRequestProcessor вызывает LLM для AI-Actions
- [ ] Трансформации применяются корректно
- [ ] Обратная совместимость с legacy форматом
- [ ] Все тесты проходят
- [ ] Документация обновлена

---

## Связанные документы

- [AGENTS.md](../../../AGENTS.md) — правила проекта
- [ai-action-transform-template.md](ai-action-transform-template.md) — канонический паттерн (архив; корневой `templates/` удалён)
- [PROTOCOL.md](../../../docs/new-request-flow/PROTOCOL.md) — протокол
- [TESTING-MOCKING-GUIDE.md](../TESTING-MOCKING-GUIDE.md) — тестирование
