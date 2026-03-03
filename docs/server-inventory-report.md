# Server Systems Inventory Report

**Дата анализа:** 2026-03-03  
**Цель:** Инвентаризация серверных систем [`a2a-server/src/services/`](a2a-server/src/services/) и [`a2a-server/src/neurons/`](a2a-server/src/neurons/) на соответствие симуляциям

## Сводка

| Категория | Количество | Общий объем (строк) |
|-----------|------------|---------------------|
| Core Systems | 12 | ~15,000 |
| Potentially Unused | 8 | ~51,000 |
| Questionable | 4 | ~1,500 |
| Neurons | 11 | ~3,000 |

---

## Core Systems (Required by Simulations) ✅

Все core системы существуют и функционируют:

| System | File | Lines | Status | Notes |
|--------|------|-------|--------|-------|
| **Request Processor** | [`request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts:1) | 180 | ✅ ACTIVE | Главный роутер запросов, делегирует специализированным процессорам |
| **Form Request Processor** | [`request-processors/form-request-processor.ts`](a2a-server/src/services/request-processors/form-request-processor.ts:1) | 380 | ✅ ACTIVE | Обработка `form` action-key, интерактивные формы |
| **Action Request Processor** | [`request-processors/action-request-processor.ts`](a2a-server/src/services/request-processors/action-request-processor.ts:1) | 280 | ✅ ACTIVE | Обработка `step_result`, `task_request`, `approve_action` |
| **Simulation Request Processor** | [`request-processors/simulation-request-processor.ts`](a2a-server/src/services/request-processors/simulation-request-processor.ts:1) | 260 | ✅ ACTIVE | Replay механизм для симуляций |
| **Neuron Request Processor** | [`request-processors/neuron-request-processor.ts`](a2a-server/src/services/request-processors/neuron-request-processor.ts:1) | 340 | ✅ ACTIVE | Entity recognition, graph building, neuron activation |
| **Context Manager** | [`context-manager.service.ts`](a2a-server/src/services/context-manager.service.ts:1) | 380 | ✅ ACTIVE | Управление контекстом запроса, политики retention |
| **Message Service** | [`message.service.ts`](a2a-server/src/services/message.service.ts:1) | 380 | ✅ ACTIVE | CRUD операции для сообщений, интеграция с Prisma |
| **Request Service** | [`request.service.ts`](a2a-server/src/services/request.service.ts:1) | 260 | ✅ ACTIVE | Async request processing с promiseId |
| **Action Service** | [`actions/action-service.ts`](a2a-server/src/actions/action-service.ts:1) | 360 | ✅ ACTIVE | Интеграция реестра и исполнителя действий |
| **Action Registry** | [`actions/action-registry.ts`](a2a-server/src/actions/action-registry.ts:1) | 400 | ✅ ACTIVE | Реестр действий из YAML/MD определений |
| **Action Executor** | [`actions/action-executor.ts`](a2a-server/src/actions/action-executor.ts:1) | 280 | ✅ ACTIVE | Исполнение действий с DSL поддержкой |
| **Transform Runtime** | [`transform/index.ts`](a2a-server/src/transform/index.ts:1) | 659 | ✅ ACTIVE | JSON transform pipeline (copy, set, append, parse-json, render-markdown, switch) |
| **DSL System** | [`actions/dsl/index.ts`](a2a-server/src/actions/dsl/index.ts:1) | 4,028 | ✅ ACTIVE | Parser, Validator, Resolver для YAML действий |
| **Message Builder** | [`protocol/message-builder.ts`](a2a-server/src/protocol/message-builder.ts:1) | 7,205 | ✅ ACTIVE | Фасад для специализированных builders |
| **Context Parser** | [`protocol/context-parser.ts`](a2a-server/src/protocol/context-parser.ts:1) | 6,280 | ✅ ACTIVE | Парсинг и валидация Context Blocks |
| **LLM Adapter** | [`llm-adapter.ts`](a2a-server/src/services/llm-adapter.ts:1) | 170 | ✅ ACTIVE | Интеграция с OpenAI/Ollama/proxy |
| **Proxy Client** | [`proxy-client.ts`](a2a-server/src/services/proxy-client.ts:1) | 23,044 | ✅ ACTIVE | Enhanced HTTP client для AI proxy (cache, rate limit, circuit breaker) |
| **Ollama Adapter** | [`ollama-adapter.ts`](a2a-server/src/services/ollama-adapter.ts:1) | 2,458 | ✅ ACTIVE | Promise-based Ollama integration |

### Action-Keys Usage в Simulations

| Action-Key | Использование в симуляциях | Server Component | Client Component |
|------------|---------------------------|------------------|------------------|
| `form` | Все симуляции (coder, auto-ai, dialog, task-decomposition) | [`form-request-processor.ts`](a2a-server/src/services/request-processors/form-request-processor.ts:1) | Form Renderer |
| `message` | coder, dialog, analyze | [`action-request-processor.ts`](a2a-server/src/services/request-processors/action-request-processor.ts:1) | Message Display |
| `script` | fix-vue-imports, phpunit-deprecations, task-decomposition | ActionRegistry + DSL | Script Runner |
| `read-file` | coder, auto-ai, analyze | **⚠️ TYPES ONLY** - [`generated-types.ts`](a2a-server/src/actions/generated-types.ts:122) | File Reader |
| `write-file` | coder, auto-ai, analyze, task-decomposition | **⚠️ TYPES ONLY** - [`generated-types.ts`](a2a-server/src/actions/generated-types.ts:123) | File Writer |
| `rag-search` | coder, fix-vue-imports-batched, analyze | **⚠️ TYPES ONLY** - [`generated-types.ts`](a2a-server/src/actions/generated-types.ts:124) | RAG Client |
| `execute-command` | auto-ai | **⚠️ TYPES ONLY** - [`generated-types.ts`](a2a-server/src/actions/generated-types.ts:125) | Terminal |

---

## Potentially Unused Systems ⚠️

| System | File | Lines | Sim Usage | Recommendation |
|--------|------|-------|-----------|----------------|
| **Entity Recognizer** | [`entity-recognizer.service.ts`](a2a-server/src/services/entity-recognizer.service.ts:1) | ~21,079 | NONE | ⚠️ **MARK FOR REVIEW** - Используется только в neuron-request-processor, не используется в симуляциях напрямую |
| **Phase Machine** | [`phase-machine.service.ts`](a2a-server/src/services/phase-machine.service.ts:1) | ~13,945 | NONE | ⚠️ **MARK FOR REVIEW** - Используется только в neuron-request-processor, упоминается в task-decomposition |
| **Framework Extractor** | [`framework-extractor.service.ts`](a2a-server/src/services/framework-extractor.service.ts:1) | ~9,244 | NONE | ⚠️ **MARK FOR REVIEW** - Используется в neuron-request-processor |
| **Graph Store** | [`graph-store.service.ts`](a2a-server/src/services/graph-store.service.ts:1) | ~7,425 | NONE | ⚠️ **MARK FOR REVIEW** - Используется в neuron-request-processor |
| **Request State Manager** | [`request-state-manager.ts`](a2a-server/src/services/request-state-manager.ts:1) | ~20,519 | NONE | ⚠️ **MARK FOR REVIEW** - Частично дублирует ContextManager + PhaseMachine |
| **Neuron Activator** | [`neuron-activator.service.ts`](a2a-server/src/services/neuron-activator.service.ts:1) | ~3,515 | NONE | ⚠️ **MARK FOR REVIEW** - Тонкая обертка над neurons/index.ts |
| **AI Session Context** | [`ai-session-context.service.ts`](a2a-server/src/services/ai-session-context.service.ts:1) | ~596 | NONE | ⚠️ **CANDIDATE FOR REMOVAL** - Функционал перенесен в ContextManager |
| **Action Scripts Service** | [`action-scripts.service.ts`](a2a-server/src/services/action-scripts.service.ts:1) | ~668 | NONE | ⚠️ **CANDIDATE FOR REMOVAL** - Stub, реальный функционал в ActionRegistry |
| **Index Query Service** | [`index-query.service.ts`](a2a-server/src/services/index-query.service.ts:1) | ~746 | NONE | ⚠️ **CANDIDATE FOR REMOVAL** - TODO: Re-implement when vector search is needed |

---

## Questionable Systems (Need Decision) ⚠️

| System | File | Lines | Issue | Recommendation |
|--------|------|-------|-------|----------------|
| **Invoke Service** | [`invoke.service.ts`](a2a-server/src/services/invoke.service.ts:1) | ~2,063 | Используется для stateless вызовов | ✅ **KEEP** - Используется в API routes |
| **Promise Pool** | [`promise-pool.ts`](a2a-server/src/services/promise-pool.ts:1) | ~1,138 | Concurrency-limited promise pool | ✅ **KEEP** - Используется для Ollama polling |
| **Questions Handler** | [`questions-handler.service.ts`](a2a-server/src/services/questions-handler.service.ts:1) | ~775 | Обработка вопросов | ⚠️ **REVIEW** - Функционал может быть в FormRequestProcessor |
| **Context Manager Sub-modules** | `context-manager.*.ts` (7 файлов) | ~4,000 | Разбиты на мелкие модули | ⚠️ **CONSIDER MERGE** - Объединить в основной сервис |
| **Message Sub-modules** | `message.*.ts` (6 файлов) | ~5,000 | batch, cache, events, pagination, types, validator | ⚠️ **CONSIDER MERGE** - Объединить в MessageService |

---

## Neurons Analysis

| Neuron | File | Lines | Purpose | Status |
|--------|------|-------|---------|--------|
| **Task Semantic Analyzer** | [`task-semantic-analyzer.neuron.ts`](a2a-server/src/neurons/task-semantic-analyzer.neuron.ts:1) | ~1,368 | Определяет уровень детализации задачи | ACTIVE |
| **Project Context Detector** | [`project-context-detector.neuron.ts`](a2a-server/src/neurons/project-context-detector.neuron.ts:1) | ~1,287 | Определяет фреймворк и архитектуру | ACTIVE |
| **File Collector** | [`file-collector.neuron.ts`](a2a-server/src/neurons/file-collector.neuron.ts:1) | ~1,758 | Собирает необходимые файлы | ACTIVE |
| **External AI Trigger** | [`external-ai-trigger.neuron.ts`](a2a-server/src/neurons/external-ai-trigger.neuron.ts:1) | ~1,131 | Триггер для внешнего AI | ACTIVE |
| **Validation Neuron** | [`validation.neuron.ts`](a2a-server/src/neurons/validation.neuron.ts:1) | ~729 | Активируется для FormRequest/Laravel | ACTIVE |
| **Lint Inertia** | [`lint-inertia.neuron.ts`](a2a-server/src/neurons/lint-inertia.neuron.ts:1) | ~9,182 | 7 нейронов для Inertia.js lint | CONDITIONAL |
| **Lint PHP** | [`lint-php.neuron.ts`](a2a-server/src/neurons/lint-php.neuron.ts:1) | ~5,387 | 4 нейрона для PHP lint | CONDITIONAL |
| **Lint Accessibility** | [`lint-accessibility.neuron.ts`](a2a-server/src/neurons/lint-accessibility.neuron.ts:1) | ~5,217 | 4 нейрона для a11y | CONDITIONAL |
| **Lint PowerShell** | [`lint-powershell.neuron.ts`](a2a-server/src/neurons/lint-powershell.neuron.ts:1) | ~5,416 | 4 нейрона для PowerShell | CONDITIONAL |
| **Lint Testing** | [`lint-testing.neuron.ts`](a2a-server/src/neurons/lint-testing.neuron.ts:1) | ~3,996 | 3 нейрона для тестов | CONDITIONAL |

### Neuron Activation Flow

```
Priority 10: taskSemanticAnalyzerNeuron      (всегда)
Priority 9:  projectContextDetectorNeuron    (по фреймворкам)
Priority 8:  fileCollectorNeuron            (по файлам/paths)
Priority 8:  lintInertiaNeurons             (если inertia обнаружен)
Priority 8:  lintAccessibilityNeurons       (если vue/react)
Priority 6:  lintPhpNeurons                 (если php обнаружен)
Priority 5:  validationNeuron               (если validation/formrequest)
Priority 4:  lintPowershellNeurons          (если powershell)
Priority 3:  lintTestingNeurons             (если testing framework)
Priority 1:  externalAiTriggerNeuron        (всегда последним)
```

---

## Action-Keys to Services Mapping

| Action-Key | Simulation Examples | Server Component | Client Component | Status |
|------------|---------------------|------------------|------------------|--------|
| `form` | coder/1, auto-ai/1, dialog/1 | [`form-request-processor.ts`](a2a-server/src/services/request-processors/form-request-processor.ts:1) | Form Renderer | ✅ IMPLEMENTED |
| `message` | coder/5, dialog/3 | [`action-request-processor.ts`](a2a-server/src/services/request-processors/action-request-processor.ts:1) | Message Display | ✅ IMPLEMENTED |
| `script` | fix-vue-imports/2, phpunit-deprecations/3 | ActionRegistry + DSL | Script Runner | ✅ IMPLEMENTED |
| `read-file` | coder/4, auto-ai/6 | **TYPES ONLY** | File Reader | ⚠️ CLIENT-ONLY |
| `write-file` | coder/7, auto-ai/7 | **TYPES ONLY** | File Writer | ⚠️ CLIENT-ONLY |
| `rag-search` | coder/3, fix-vue-imports-batched/5 | **TYPES ONLY** | RAG Client | ⚠️ CLIENT-ONLY |
| `execute-command` | auto-ai/13 | **TYPES ONLY** | Terminal | ⚠️ CLIENT-ONLY |

---

## Missing Server Implementations

| Action-Key | Needed For | Priority | Notes |
|------------|------------|----------|-------|
| **rag-search** | coder, analyze, fix-vue-imports-batched симуляции | HIGH | Сейчас RAG только на клиенте. Нужен серверный RAG для централизованного поиска |
| **read-file** | coder, auto-ai симуляции | MEDIUM | Сейчас файловые операции только на клиенте |
| **write-file** | coder, auto-ai, analyze симуляции | MEDIUM | Сейчас файловые операции только на клиенте |
| **execute-command** | auto-ai симуляции | MEDIUM | Сейчас команды выполняются на клиенте |

### Action-Keys в Symуляциях (фактическое использование)

```
rag-search:     ████████████████████  18 использований (coder, analyze, fix-vue-imports-batched)
write-file:     ███████████████       15 использований (coder, auto-ai, analyze, task-decomposition)
read-file:      ████████               8 использований (coder, auto-ai)
script:         ██████                 6 использований (fix-vue-imports, phpunit-deprecations)
execute-command: ██                     2 использования (auto-ai)
```

---

## Architecture Recommendations

### 1. Cleanup Low-Impact Unused Code

```bash
# Рекомендуется к удалению (low effort, no impact):
a2a-server/src/services/ai-session-context.service.ts     # 596 lines - функционал в ContextManager
a2a-server/src/services/action-scripts.service.ts         # 668 lines - stub
a2a-server/src/services/index-query.service.ts            # 746 lines - TODO stub
```

### 2. Review High-Impact Systems

| System | Lines | Decision Needed |
|--------|-------|-----------------|
| entity-recognizer.service.ts | ~21k | Keep/Refactor/Remove? |
| request-state-manager.ts | ~20k | Keep/Merge into RequestProcessor? |
| phase-machine.service.ts | ~14k | Keep/Remove? |
| framework-extractor.service.ts | ~9k | Keep/Integrate into RAG? |
| graph-store.service.ts | ~7k | Keep/Remove? |

### 3. Consider Sub-module Consolidation

- `context-manager.*.ts` (7 files, ~4,000 lines) → `context-manager.service.ts`
- `message.*.ts` (6 files, ~5,000 lines) → `message.service.ts`

### 4. Implement Missing Server Services (Future)

Приоритет реализации серверных сервисов для action-keys:
1. **RAG Service (Server)** - нужен для coder симуляций
2. **File Service (Server)** - нужен для централизованного файлового доступа
3. **Command Service (Server)** - нужен для remote execution

---

## Lines of Code Summary

### Services
| Category | Files | Total Lines |
|----------|-------|-------------|
| Core Request Processing | 5 processors | ~30,000 |
| Context & State | 8 context-manager* + state-manager | ~25,000 |
| Message System | 7 message* | ~18,000 |
| AI/Proxy Integration | 6 services | ~52,000 |
| Auth System | 8 auth* | ~3,000 |
| Entity & Graph | 4 services | ~48,000 |
| Other Services | 10 services | ~12,000 |
| **TOTAL Services** | **~50 файлов** | **~188,000** |

### Neurons
| Category | Files | Total Lines |
|----------|-------|-------------|
| Task Analysis | 5 neurons | ~6,500 |
| Lint Neurons | 5 files | ~29,000 |
| **TOTAL Neurons** | **11 файлов** | **~35,500** |

---

## Appendix: Service Dependencies

```
request-processor.service.ts
├── request-processors/
│   ├── action-request-processor.ts → action-processor.ts
│   ├── form-request-processor.ts
│   ├── simulation-request-processor.ts
│   └── neuron-request-processor.ts → neuron-activator.service.ts
│                         └── entity-recognizer.service.ts
│                         └── graph-store.service.ts
│                         └── framework-extractor.service.ts
│                         └── phase-machine.service.ts
├── request-state-manager.ts → context-manager.service.ts
│                            └── phase-machine.service.ts
├── request.service.ts
└── invoke.service.ts

context-manager.service.ts
├── context-manager.*.ts (sub-modules)
└── Используется: neuron-request-processor.ts, request-state-manager.ts

neurons/index.ts
├── task-semantic-analyzer.neuron.ts
├── project-context-detector.neuron.ts
├── file-collector.neuron.ts
├── validation.neuron.ts
├── external-ai-trigger.neuron.ts
└── lint-* neurons
```

---

*Отчет обновлен на основе фактической проверки исходного кода.*
