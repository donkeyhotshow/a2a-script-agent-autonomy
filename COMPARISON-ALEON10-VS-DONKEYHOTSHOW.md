# Сравнение: aleon10 vs donkeyhotshow (a2a-script-agent)

## Общая картина

| Параметр | aleon10/main | donkeyhotshow (текущий) |
|----------|-------------|--------------------------|
| **Репозиторий** | `aleon10/a2a-script-agent` | `donkeyhotshow/a2a-script-agent` |
| **Ветка** | `main` | `copilot/add-autonomy-first-agent` |
| **Commit** | `f8bf802a` ("пуш пуш") | `28eb4313` |
| **Файлов** | 2,982 | — (close to 2,981) |
| **Статус** | опережает на 2 коммита | отстаёт от origin/main |
| **Net changes** | — | -37,891 lines (1668 files) |

## Git связь

```
Текущий репо (donkeyhotshow):
├── origin  → https://github.com/donkeyhotshow/a2a-script-agent
└── aleon10 → https://github.com/aleon10/a2a-script-agent

Сравнение: HEAD (28eb4313) vs aleon10/main (f8bf802a)
- 1,668 files changed
- +53,580 insertions, -91,471 deletions
```

## Ключевые архитектурные различия

### Удалено в aleon10 (из a2a-server/src/services/):

| Удалённый файл/модуль | Назначение | ADR |
|----------------------|-----------|-----|
| `autonomy-glue.ts` | Autonomy decision gate | — |
| `orchestrator-kernel.ts` | FSM orchestrator | ADR-0052 |
| `cognitive-engine.ts` | OODA-loop reasoning | ADR-0060 |
| `core/event-bus.ts` | Event system | — |
| `goal-planner.ts` | Goal planning | — |
| `prompt-router.ts` | Prompt routing | — |
| `core/safety-layer/` | SafetyLayer, LoopDetector, ContextValidator, ConfidenceTracer | ADR-0035 |
| `session-compaction.ts` | Session compaction | — |
| `evaluation/llm-judge.ts` | LLM evaluation | — |
| `evaluation/vision-tester.ts` | Vision testing | ADR-0060 |
| `framework-detector.service.ts` | Framework detection | — |
| `memory/` (episodic, temporal) | Memory systems | ADR-0049 |
| `monitoring/tool-tracker.ts` | Tool tracking | — |
| `policy/policy-engine.ts` | Policy engine | — |
| `registry-v2.ts` | Registry v2 | ADR-0039 |

### Добавлено в aleon10 (новые модули):

```
a2a-server/src/services/
├── core/black-room/              # NEW: Algorithm mode (ADR-0058)
│   ├── algorithm-registry.ts     # Manages algorithm definitions
│   ├── black-room-orchestrator.ts # Executes algorithms on Local LLM upstream
│   └── types.ts                  # Algorithm types
├── gray-room/                    # Refactored Gray Room
│   ├── compress-history.ts        # History compression
│   ├── gray-room-orchestrator.ts # Refactored orchestrator
│   ├── gray-room-trigger.ts      # Gray room triggering
│   ├── gray-room-utils.ts        # Utilities
│   └── gray-room-interrupt-handlers/
│       ├── auto-rag-page.ts
│       ├── auto-read-file.ts
│       ├── clarify.ts
│       └── thinking.ts
├── handlers/                     # Request handlers
│   ├── approve-action-handler.ts
│   ├── router-choice-handler.ts
│   ├── step-complete-handler.ts
│   ├── step-result-handler.ts
│   └── task-request-handler.ts
├── algorithm-invoke.ts            # Algorithm invoke service
└── request-processor/
    ├── llm-model-resolver.ts     # Model resolution
    ├── normalization.ts          # Request normalization (+129 lines)
    └── sequence-workbench.ts     # Workbench sequencing
```

## ADR сравнение

### Новые ADR в aleon10 (отсутствуют в текущем):

| ADR | Название |
|-----|----------|
| ADR-0058 | Gray Room Split - Prompt vs Algorithm Mode (Black Room) |
| ADR-0059 | invoke llm model and proxy tags |
| ADR-PHPantom | PHPantom Integration |
| ADR-ClawCode | ClawCode Orchestration |
| ADR-Premium-UI | Premium UI Architecture |

### Общие ADR (с разными версиями):

| ADR | Текущий (donkeyhotshow) | aleon10 |
|-----|------------------------|---------|
| ADR-0060 | Sight-Driven Verification | Vision QA (похожее название) |

### Отсутствующие в aleon10:

| ADR | Название |
|-----|----------|
| ADR-0027 | Documentation Canonical Sources (есть в текущем) |

## Ключевые выводы

### 1. Направление развития

- **aleon10/main**: Переход к **deterministic Black Room** — алгоритмический режим вместо LLM-driven autonomous decisions
- **Текущий (donkeyhotshow)**: Развивает **Autonomy-First Agent** — продолжает autonomous/safety/cognitive архитектуры

### 2. Философия

| Аспект | aleon10 | donkeyhotshow (текущий) |
|--------|---------|-------------------------|
| **Режим Black Room** | Algorithm-first (deterministic) | Cognitive engine + SafetyLayer |
| **Память** | Удалена (net -37k lines) | Episodic + Temporal memory |
| **Safety** | Удалён SafetyLayer | PolicyEngine, LoopDetector |
| **Gray Room** | Refactored — interrupt handlers | Original gray-room-orchestrator |

### 3. Что можно позаимствовать у aleon10

1. **Black Room algorithm registry** — структурированный deterministic execution
2. **Gray Room interrupt handlers** — более модульная архитектура
3. **Request handlers** — разделение логики (approve, router-choice, step-result)
4. **Sequence workbench** — workbench sequencing логика

### 4. Что текущий репо имеет ценное

1. **CognitiveEngine** — OODA-loop reasoning
2. **SafetyLayer** — agentic reasoning safety (ADR-0035)
3. **PolicyEngine** — policy-based decision making
4. **Memory systems** — episodic + temporal
5. **ToolTracker** — tool usage monitoring
6. **Registry v2** — scale-oriented registry layer

## Рекомендация

**aleon10/main — это "production-ready" ветка** с фокусом на deterministic AI execution. Текущий репо (`copilot/add-autonomy-first-agent`) — экспериментальная ветка с autonomous agent capabilities.

Для интеграции можно:
1. Взять Black Room architecture из aleon10
2. Сохранить CognitiveEngine + SafetyLayer как опциональные "advanced" режимы
3. Использовать ADR-0058 как основу для Gray Room refactoring