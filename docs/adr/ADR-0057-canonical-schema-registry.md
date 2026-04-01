# ADR-0057: Canonical Schema Registry

- **Status:** Accepted
- **Date:** 2026-04-01
- **Author:** Alex Ribchinskiy
- **Impact:** Medium | **Complexity:** Medium | **Risk:** Low
- **Estimated Effort:** 1 week | **Priority:** P1
- **Deciders:** Backend team lead

---

## Context

Artifact schemas were defined implicitly in TypeScript interfaces scattered across files. No runtime validation occurred, allowing malformed artifacts to silently persist in ArtifactStore and cause downstream errors.

## Decision

Maintain a **Canonical Schema Registry** at `a2a-server/src/artifacts/schemas/`:

```
schemas/
├── base.schema.json             # ArtifactBase
├── confidence_trace.schema.json
├── execution_decision.schema.json
├── waiting_state.schema.json
├── loop_signal.schema.json
├── dryrun_delta.schema.json
├── memory_influence.schema.json
├── validation_summary.schema.json
├── ... (one file per artifact type)
└── index.ts                     # exports: Record<ArtifactType, JSONSchema>
```

### Validation

`ArtifactValidator` applies the schema before `ArtifactStore.write()`:

```typescript
class ArtifactValidator {
  validate<T extends ArtifactBase>(artifact: T): ValidationResult {
    const schema = SchemaRegistry[artifact.artifact_type];
    if (!schema) return { valid: false, error: 'UNKNOWN_ARTIFACT_TYPE' };
    return ajv.validate(schema, artifact)
      ? { valid: true }
      : { valid: false, errors: ajv.errors };
  }
}
```

Write is **rejected** if validation fails — the error is logged as `A2A_MESSAGE_ERROR` and the writing component is notified synchronously.

### Schema Versioning

All schemas include `"schema_version": "2.0"` as a required field. On future breaking changes, bump to `"2.1"` etc. and add a migration handler.

## Consequences

### Positive
- Runtime guarantee: no malformed artifacts in ArtifactStore
- Schema files are the single source of truth (TypeScript types generated from them)
- Enables cross-team contract enforcement

### Negative
- ~1ms overhead per artifact write (ajv is fast, but measurable at scale)
- Schema drift between JSON Schema and TypeScript types must be managed (codegen solves this)

---

*Version: 1.0 | Date: 2026-04-01*  
*These ADRs are the direct result of the Architecture Blueprint v2.0 audit.*  
*They supersede any conflicting guidance in ADRs 0035–0051.*


---

# Architectural Decision Record (ADR) v2.0: Комплексная Эволюция A2A-Script-Agent

## 1. Заголовок: Стратегическая Дорожная Карта и Архитектурные Улучшения A2A-Script-Agent

## 2. Статус: Предложено (Расширенная версия)

## 3. Дата: 1 апреля 2026 г.

## 4. Контекст и Проблематика

На основе анализа текущей спецификации `A2A-Script-Agent` и нового **ADR-0035 (Agentic Reasoning Safety Layer)**, выявлены критические области, требующие архитектурного вмешательства для достижения целевого показателя **Success Rate ≥ 85%** и снижения нагрузки на оператора на **30%**. 

Текущие болевые точки:
- **Контентные петли:** Бесконечные вызовы `auto_read_file` или `auto_rag_page` с идентичными параметрами.
- **Отсутствие Confidence Gate:** Агент продолжает выполнение даже при низкой уверенности в `next_action`.
- **Context Drift:** Расхождение между Client Storage и Gray Room при параллельных запросах.
- **Отсутствие Self-Correction:** Немедленная передача управления оператору при `outcome: 'failed'` без попыток отката (backtrack).

## 5. Результирующие Архитектурные Решения (Топ-20)

Мы объединили 15 предыдущих идей с 5 новыми критическими улучшениями, вытекающими из анализа ADR-0035 и операционных данных.

### 5.1. Safety, Guardrails & Reliability (Новое ядро)

#### Идея 1: Интеллектуальный LoopDetector (Turn-based Intercept)
**Суть:** Внедрение хука в `GrayRoomOrchestrator.runLoop()`, отслеживающего тройки `(reason, outcome_class, context_hash)`. При повторе ≥ 3 раз генерируется `LOOP_SIGNAL`.
**Интеграция:** Использование SHA256-хэширования последних 100 токенов контекста для детерминированного обнаружения циклов без ложных срабатываний при изменении данных.

#### Идея 2: ConfidenceTracer & WAITING_STATE
**Суть:** LLM-powered гейт (0.0–1.0), анализирующий `workbench.slots.thinking`. При `score < 0.7` выполнение переходит в `WAITING_STATE`.
**Интеграция:** Асинхронный вызов sidecar LLM только при наличии `thinkingSlot`, минимизирующий latency (бюджет < 800ms).

#### Идея 3: Context Integrity Guard (Anti-drift)
**Суть:** Сравнение хэша истории из Client Storage (`session.json`) с хэшем Gray Room перед каждой итерацией цикла.
**Интеграция:** При обнаружении `INTEGRITY_VIOLATION` — немедленная остановка для предотвращения галлюцинаций на "битом" контексте.

#### Идея 4: Runtime Formal Verification (AgentGuard)
**Суть:** Проверка `EXECUTION_DECISION` против формального `Cognitive Blueprint`.
**Интеграция:** Верификационный движок в `AutonomyGates`, блокирующий действия, выходящие за рамки разрешенного "многообразия ограничений" (constraint manifold).

#### Идея 5: Детерминированная Пре-Действие Авторизация
**Суть:** Проекция политик безопасности на этапе планирования, а не фильтрация результата.
**Интеграция:** Модуль `PolicyGuard`, корректирующий предлагаемые действия до их выполнения.

### 5.2. Advanced Orchestration & Memory

#### Идея 6: A2A Protocol v2 (MCP-based)
**Суть:** Стандартизация асинхронного взаимодействия агентов через Model Context Protocol.
**Интеграция:** Строгая типизация сообщений (handoff, status, error) в `a2a-server/src/protocol`.

#### Идея 7: Иерархическая Память (Experience Pack)
**Суть:** Разделение памяти на `PatternStore` (паттерны) и `LessonStore` (уроки/ошибки).
**Интеграция:** Анализ `LESSON` артефактов для извлечения долгосрочных знаний.

#### Идея 8: Кросс-сессионный Перенос Знаний (Lifelong Learning)
**Суть:** Перенос валидированных уроков между независимыми проектами/пользователями.
**Интеграция:** Централизованный, но изолированный (tenant-scoped) серверный слой знаний.

#### Идея 9: Спекулятивное Выполнение (Shadow Runs)
**Суть:** Параллельный запуск нескольких траекторий в изолированных Gray Rooms.
**Интеграция:** Выбор лучшего результата на основе `CONFIDENCE_TRACE`.

#### Идея 10: Контекстный Прунинг (Dynamic Compaction)
**Суть:** Динамическое удаление нерелевантных токенов на основе сигналов из `InternalTrace`.
**Интеграция:** `ContextManager`, предотвращающий деградацию модели на длинных сессиях.

### 5.3. Developer & Operator Experience (DX/OX)

#### Идея 11: Dry Run Plan Preview (PlanGraph)
**Суть:** Визуализация `DRYRUN_PLANGRAPH` с предсказанными точками пауз и рисками.
**Интеграция:** Интерактивный UI-компонент для одобрения плана оператором перед запуском.

#### Идея 12: Time-Travel Debugging & State Editing
**Суть:** Визуализация эволюции состояния с возможностью отката и изменения переменных.
**Интеграция:** Запись `EXECUTION_TRACE` и использование `Checkpoint Resume Durability` для отладки.

#### Идея 13: Natural-Language Agent Harnesses (NLAH)
**Суть:** Описание логики оркестратора в Markdown-файлах вместо жесткого кода.
**Интеграция:** Интерпретатор NLAH, позволяющий изменять поведение системы "на лету" без деплоя.

#### Идея 14: Визуализация Паттернов Оркестрации (Visual MAS)
**Суть:** Графическое представление схем взаимодействия (Swarm, Supervisor, Handoff).
**Интеграция:** Внедрение Mermaid/D3 визуализаций в `Task Flow Panel`.

#### Идея 15: Мета-Оптимизация (Meta-Harness)
**Суть:** Автоматическое улучшение промптов и "обвязок" на основе анализа ошибок.
**Интеграция:** Агент-оптимизатор, предлагающий изменения в `ROLLBACK_LESSON`.

### 5.4. Self-Evolution & Specialized Logic

#### Идея 16: EvoFSM (Finite State Machine Evolution)
**Суть:** Эволюция явного конечного автомата вместо свободного переписывания промптов.
**Интеграция:** Разделение на макро-логику (Flow) и микро-навыки (Skill) для стабильности.

#### Идея 17: Resource-Aware Scheduling
**Суть:** Планировщик, учитывающий бюджет токенов и лимиты контекста.
**Интеграция:** Модуль `ResourceScheduler` в `AutonomyGates`.

#### Идея 18: Символьное Обучение (Symbolic Self-Correction)
**Суть:** Обновление символьных правил логики на основе фидбека среды.
**Интеграция:** Шаг "Rule Synthesis" в цикле самокоррекции.

#### Идея 19: Zero-Start In-Situ Evolution
**Суть:** Возможность работы в полностью неизвестных средах с нуля.
**Интеграция:** Режим `Discovery Mode` в `ProjectScanner`.

#### Идея 20: Heuristic Fallback для ConfidenceTracer
**Суть:** Использование быстрых эвристик (regex, keyword analysis) при отказе LLM-гейта.
**Интеграция:** Двухуровневая проверка уверенности для обеспечения p95 Latency < 1ms.

## 6. Сводная Таблица Метрик и Воздействия

| Идея | Категория | Влияние на Success Rate | Влияние на Latency | Сложность |
|:---|:---|:---:|:---:|:---:|
| **LoopDetector** | Safety | +15% | < 1ms | Low |
| **Confidence Gate** | Safety | +20% | +800ms | Medium |
| **Context Integrity** | Reliability | +5% | < 1ms | Low |
| **EvoFSM** | Evolution | +10% | N/A | High |
| **Dry Run Preview** | DX | +10% (via human) | N/A | Medium |

## 7. План Реализации (Фазы)

1.  **Фаза 1 (Недели 1-2):** Внедрение `LoopDetector` и `ContextValidator` (ADR-0035). Реализация `DRYRUN_PLANGRAPH`.
2.  **Фаза 2 (Недели 3-4):** Запуск `ConfidenceTracer` (сначала эвристики, затем LLM). Внедрение `A2A Protocol v2`.
3.  **Фаза 3 (Месяц 2):** Реализация `EvoFSM` и `Experience Pack`. Кросс-сессионный перенос знаний.
4.  **Фаза 4 (Месяц 3+):** Спекулятивное выполнение и формальная верификация (AgentGuard).

## 8. Заключение

Данный расширенный ADR консолидирует лучшие практики индустрии и специфические потребности `A2A-Script-Agent`. Фокус на **Safety Layer** и **Deterministic Orchestration** позволит системе выйти на уровень production-ready с предсказуемым поведением и высокой автономностью.

---
**References:**
- [1] GoalfyMax: Protocol-Driven MAS
- [2] The Auton Agentic AI Framework (Constraint Manifold)
- [3] SE-Agent: Trajectory Optimization
- [4] AgentGuard: Runtime Verification
- [5] EvoFSM: Controllable Self-Evolution
- [6] ADR-0035: Agentic Reasoning Safety Layer (Internal Doc)
- [7] ADR-0036: Memory Orchestration (Master Spec)
