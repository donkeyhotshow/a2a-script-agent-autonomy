# Предложения по развитию тестовой архитектуры (Papa–Mama)

> Создано: 2026-04-04  
> Контекст: реализация матрицы Papa–Mama test matrix ([`PROMPT-PAPA-MAMA-TEST-MATRIX.md`](../../PROMPT-PAPA-MAMA-TEST-MATRIX.md))

---

## Статус текущей реализации

| Компонент | Статус | Примечание |
|-----------|--------|------------|
| Mama (indirect-tests) | ✅ 7/7 green | Базовые валидаторы + realistic fixture (`sim-agent-vertical`) |
| Papa (direct-tests) | 🟡 Требует live stack | Документированы `--only` и env flags для уменьшения LLM-нагрузки |
| Session storage audit | ⚠️ Empty workspace | Нет реальных сессий для анализа дрейфа |

---

## Глубокий анализ структур (2026-04-04)

### 1. Gray Room Trace Patterns (из simulations)

**Найденные реальные traces:**

```
interrupt-thinking/1-sub-1:
  llm_output (primary) → response_transform (thinking) → sidecar_llm → interrupt_handler (thinking)

interrupt-thinking/1-sub-2:
  llm_output (primary) → response_transform (auto_rag_page) → interrupt_handler (auto_rag_page) 
  → request_rebuild → llm_output (follow_up) → response_transform

gray-room-auto-read-file/1:
  llm_output → response_transform (auto_read_file) → sidecar_llm → interrupt_handler (auto_read_file, continueLoop=false)
```

**Gray Room Handlers (6 штук в orchestrator):**
- `compress_history` — сжатие истории
- `thinking` — рассуждение
- `auto_read_file` — автоматическое чтение файла
- `auto_rag_page` — автоматический RAG поиск
- `clarify` — уточнение
- `algorithm_invoke` — вызов алгоритма (black room)

**Вывод:** Только 3/6 handlers имеют fixtures. Нет цепочек: `compress_history → thinking → auto_read_file`, `clarify` диалог, `algorithm_invoke`.

**Gap:** Не покрыты 50% gray room paths.

---

### 2. Execute Shape — нарушения и их детекция

**Результаты сканирования (audit-execute-shape-explore.mjs):**

| Источник | Просканировано | Нарушения | Статус |
|----------|----------------|-----------|--------|
| `simulations/sync/*` | 29 категорий | 0 | ✅ Чисто |
| `storage/sessions/*` | 0 сессий | N/A | ⚠️ Нет данных |
| `tests/indirect-tests/*` | 2 fixtures | 0 | ✅ Чисто |

**Паттерны нарушений (из `check-llm-execute-shape.mjs`):**

| Код | Паттерн | Severity | Детекция |
|-----|---------|----------|----------|
| `TOP_LEVEL_MESSAGE_WITH_TOOL` | `{message, execute: {read-file, message}}` | High | `analyzeLlmExecuteShape()` |
| `MULTI_KEY_EXECUTE` | `execute: {message, form}` или `{rag-search, read-file}` | High | single-key rule |
| `DIALOG_EXECUTE_MULTIPLE_ACTIONS` | `execute` с несколькими tool/form keys | High | `validateDialogExecuteShape()` |
| `FLAT_ACTION` | `execute.action="read-file"` + params | Medium | key-shape check |
| `RESULT_BARE_CONTENT` | `result: {content: "..."}` (legacy) | Medium | `validateResultShape()` |
| `RESULT_BARE_RESULTS` | `result: {results: [...]}` (legacy) | Medium | `validateResultShape()` |

**Single-key rule валидно vs невалидно:**

```json
// ✅ Валидно (1 ключ)
{ "execute": { "read-file": { "path": "src/app.js" } } }
{ "execute": { "form": { "choices": [...] } } }
{ "execute": { "message": "Done" } }

// ❌ Невалидно (2+ ключей)
{ "execute": { "message": "Reading...", "read-file": {...} } }  // MULTI_KEY_EXECUTE
{ "execute": { "rag-search": {...}, "read-file": {...} } }      // MULTI_TOOL
```

**Pattern B (валидный но рискованный):**

```json
// Валидно: execute.message + один tool key
{ "execute": { "message": "Reading file...", "read-file": { "path": "app.js" } } }
```

Найден в `prompts/dialog-request.md` — серверная валидация отлавливает нарушения, но drift возможен при LLM errors.

---

### 3. Sticky Router — детальная логика переходов

**Валидный переход:**

```
Step 1: context.execution={action:"task", step:"router"}, execute.form.choices=[...]
Client: result.choice="agent"

Step 2: context.execution={action:"task", step:"router"}, status="processing"  // intermediate

Step 3: context.execution={action:"agent", step:"request"}, execute.form.input=[...]  // final
```

**Нарушения:**
- `STICKY_ROUTER`: после `result.choice` снова `execute.form.choices` + `execution.action=router`
- `ACTION_JUMP`: скачок `action` без промежуточного `processing/completed`

**Валидаторы в runtime:**

| Валидатор | Локация | Что проверяет | Когда вызывается |
|-----------|---------|---------------|------------------|
| `validateDialogExecuteShape()` | `transform-execute-validator.ts` | single-key, form/tool/mix | После transform (dialog) |
| `validateAgentExecuteShape()` | `transform-execute-validator.ts` | single-key, chat/tool | После transform (agent) |
| `validateResultShape()` | `transform-execute-validator.ts` | action-key формат | После transform |
| `validateRouterResultShape()` | `transform-execute-validator.ts` | choices array | После router transform |
| `warnOnInvalidExecute()` | `gray-room-orchestrator.ts` | логирование violations | Gray room finalize |

**Вывод:** Валидация есть в runtime, но нет offline аудита на накопленные сессии (drift detection).

---

## Матрица failure class → тестовый слой

| Failure Class | Papa (live stack) | Mama (offline) | Приморитет |
|--------------|-------------------|----------------|------------|
| **Sticky router** | `e2e-dialog-test.js --only=router*` | Session replay from disk | Высокий — чекер для Mama |
| **Wrong beat** (message vs choice) | Client API `/next` с form | Request schema validation | Средний — редкий |
| **Execute single-key shape** | Real invoke, proxy body scan | `scan-session-responses`, simulations | Высокий — drift частый |
| **Async stuck/processing** | Poll `/async`, hub health | N/A (требует live) | — |
| **Gray room sequence** | Agent mode E2E | `interruptTrace` snapshot validation | Высокий — недостаточно fixtures |
| **Schema/MD drift** | N/A | `sim:check-md` | Средний — CI gate |
| **Import extensions** (NodeNext) | N/A | `validate-import-extensions` | ✅ Стабильно |
| **Router descriptions** | N/A | `audit:sim-choice-descriptions` | Низкий — вспомогательный |

---

## Предложения по развитию (приоритеты)

### 1. Mama: Sticky router replay from disk (Высокий)

**Проблема:** Сейчас sticky router проверяется только через live E2E. Нужна возможность воспроизвести сохранённую сессию и провалидировать корректность переходов.

**Логика проверки:**
1. После `result.choice` в шаге с `execution.action=router`:
   - Следующий шаг должен сохранять `execution.action=router` до завершения обработки выбора
   - После обработки — `execution.action` меняется на целевой (agent/dialog/fix-*) или `done`
2. Неверный паттерн (sticky): `result.choice` отправлен, но следующий `server-response.json` снова имеет `execute.form.choices` с `execution.action=router`

**Предложение:**
- Сканер `audit-sticky-router.mjs`: рекурсивно читает `a2a-client/storage/sessions/*/N/server-response.json`
- Для каждой сессии строит цепочку: `[{step, action, step, hasChoices, clientResult}]`
- Флаги нарушения:
  - `STICKY_ROUTER`: step N имеет `result.choice`, step N+1 имеет `execute.form.choices` + `execution.action=router`
  - `ACTION_JUMP`: изменение `execution.action` без промежуточного `processing/completed`
- Репорт: список сессий с нарушениями + % от общего числа

**Acceptance:**
- [ ] Сканер `audit-sticky-router.mjs` с выходом в JSON (для CI) и human-readable (для debug)
- [ ] Параметр `--threshold=5` (fail если % нарушений > threshold)
- [ ] Запуск на 50+ сессиях: известные sticky router случаи детектятся, нормальные — без false positives

---

### 2. Mama: Gray room fixtures из real captures (Высокий)

**Проблема:** Сейчас gray room валидатор (`validate-gray-room-horizontal.mjs`) работает только на `example-horizontal-snapshot.json` — toy example.

**Предложение:**
- Экспортировать `context.workbench.slots.interruptTrace` из real agent-mode сессий
- Добавить в `run-all.mjs` валидацию на 3+ реальных trace:
  - `compress_history` → `thinking` → `auto_read_file`
  - `clarify` диалог
  - Algorithm invoke chain

**Acceptance:**
- [ ] 3+ realistic gray-room snapshots в `gray-room/fixtures/real-*-snapshot.json`
- [ ] Spec-файлы для каждого с описанием ожидаемой цепочки

---

### 3. Mama: Execute single-key дрейф (Высокий)

**Проблема:** LLM иногда возвращает `message` + tool на верхнем уровне вместо `execute.message` + `execute.tool`. Накапливается дрейф в storage/sessions — надо детектить и триггерить.

**Логика проверки:**
- **Валидный shape:** `execute` имеет ровно 1 ключ (action-type). Примеры: `{ "read-file": {...} }`, `{ "form": {...} }`
- **Нарушение (дрейф):** 
  - `execute.message` + `execute.read-file` (2 ключа)
  - `execute.action="read-file"` + `execute.path` (flat вместо nested)
  - `execute` отсутствует или пустой при не-terminal step

**Сканер `audit-execute-shape.mjs`:**
- Сканирует `a2a-client/storage/sessions/*/*/server-response.json`
- Для каждого step проверяет `execute` (unwrap `session`/`data` wrapper)
- Репорт:
  - Список сессий с нарушениями (sessionId, stepNum, тип нарушения)
  - % сессий с нарушениями (drift rate)
  - Частые паттерны нарушений (топ-N невалидных shapes)

**Триггеры:**
- `--fail-on-drift=1` — exit 1 если drift rate > 1%
- `--report-by-action` — группировать по `execution.action` (router/agent/dialog)

**Acceptance:**
- [ ] Сканер `audit-execute-shape.mjs` с JSON/human-readable выходом
- [ ] Параметр `--source=sessions|simulations|proxy` (универсальный для разных источников)
- [ ] Интеграция в `run-all.mjs` как стандартный шаг (source=sessions)
- [ ] Документация drift rate трендов для приоритизации фиксов

---

### 4. Papa: Уменьшение LLM-нагрузки в CI (Средний)

**Текущий state:** Есть env flags (`E2E_DIRECT_LOW_LLM`, `E2E_DIRECT_MERGE_*`), но нет стратегии когда что использовать.

**Предложение:**
- Определить tiers для CI:
  - **Tier 1 (PR fast):** Только Mama + unit tests (0 LLM calls)
  - **Tier 2 (pre-merge):** Papa с `--only=router*,health*,agentSeed` (минимум LLM)
  - **Tier 3 (nightly):** Full Papa + все async flows
- Добавить `E2E_DIRECT_TIER=1|2|3` как shorthand

**Acceptance:**
- [ ] Документирована политика tier в `tests/direct-tests/README.md`
- [ ] Добавлен `E2E_DIRECT_TIER` в `e2e-dialog-test.js`

---

### 5. Миграция validators из direct → indirect (Техдолг)

**Текущий state:** Несколько валидаторов в `tests/direct-tests/validators/` на самом деле offline (не требуют live stack).

**Кандидаты на миграцию:**
| Скрипт | Требует live? | Целевое место |
|--------|---------------|---------------|
| `scan-session-responses.mjs` | Нет (читает storage) | `indirect-tests/validators/` |
| `audit-sim-choice-descriptions.mjs` | Нет (читает simulations) | `indirect-tests/validators/` |
| `verify-gray-room-state.mjs` | Нет (offline snapshot) | `indirect-tests/gray-room/` |

**Acceptance:**
- [ ] Скрипты перемещены
- [ ] `npm run` entries обновлены
- [ ] `run-all.mjs` включает migrated checks

---

### 6. Gap: RAG pagination golden (Низкий)

**Проблема:** Нет simulations для RAG pagination (`hasMore: true/false`, accumulation across pages).

**Предложение:**
- Добавить `simulations/sync/rag-pagination/` с 3+ pages
- Проверять `context.workbench.sections.rag_results` accumulation

**Acceptance:**
- [ ] Golden simulation `rag-pagination/`
- [ ] Mama checker для `workbench.sections.*` accumulation

---

### 7. Gap: Read-file queue (Низкий)

**Проблема:** Нет goldens для множественной read-file очереди (coder-smart делает это, но не как explicit queue).

**Предложение:**
- Документировать pattern в `simulations/SCHEMA.md`
- Добавить поле `context.execution.queue` для явных очередей

---

### 8. Gap: Missing execute shape validators (Средний — найдено при расширенном поиске)

**Проблема:** `transform-execute-validator.ts` не покрывает все violation классы из `check-llm-execute-shape.mjs`.

**Runtime validators inventory (что есть сейчас):**

| Файл | Валидатор | Обнаруживает |
|------|-----------|--------------|
| `transform-execute-validator.ts` | `validateDialogExecuteShape` | `DIALOG_EXECUTE_MULTIPLE_ACTIONS`, `DIALOG_EXECUTE_MESSAGE_MISSING` |
| `transform-execute-validator.ts` | `validateAgentExecuteShape` | `AGENT_EXECUTE_MULTIPLE_ACTIONS` (implicit) |
| `transform-execute-validator.ts` | `validateRouterResultShape` | `ROUTER_CHOICES_MISSING` |
| `transform-execute-validator.ts` | `validateResultShape` | `RESULT_BARE_BLOB_CONTENT`, `RESULT_BARE_BLOB_RESULTS` |
| `check-llm-execute-shape.mjs` | `analyzeLlmExecuteShape` | `TOP_LEVEL_MESSAGE_WITH_TOOL`, `DUPLICATE_TOP_AND_EXECUTE_MESSAGE`, `TOP_AND_EXECUTE_MESSAGE_MISMATCH`, `EXECUTE_MESSAGE_ONLY` |

**Gap:** `TOP_LEVEL_MESSAGE_WITH_TOOL` и связанные violations не проверяются в runtime (gray-room-orchestrator.ts, form-choice-pipeline.ts, simulation-request-processor.ts).

**Предложение:**
- Мигрировать `analyzeLlmExecuteShape` логику в `transform-execute-validator.ts`
- Добавить `validateTopLevelMessageShape()` для проверки конфликта `message` (top-level) + `execute.*`
- Интегрировать в `warnOnInvalidExecute()` и `runFormChoicePipeline()`

**Acceptance:**
- [ ] Новый валидатор `validateLlmOutputShape()` в `transform-execute-validator.ts`
- [ ] Покрывает: `TOP_LEVEL_MESSAGE_WITH_TOOL`, `DUPLICATE_MESSAGE`, `EXECUTE_MESSAGE_ONLY`
- [ ] Unit tests в `transform-execute-validator.test.ts`
- [ ] Strict mode бросает на этих violations

---

### 9. Gap: Form-choice pipeline validation (Средний — найдено при расширенном поиске)

**Проблема:** `form-choice-pipeline.ts` валидирует только `validateFormChoiceProcessResult`, но не проверяет execute shape.

**Код:** `form-choice-pipeline.ts:33` — вызывает `validateFormChoiceProcessResult`, но `buildProcessResultFromForm` мержит `fp.execute` без shape validation.

**Предложение:**
- Добавить `validateDialogExecuteShape(result.execute)` после билда в `buildProcessResultFromForm`
- Или в `runFormChoicePipeline` после получения `processResult`

**Acceptance:**
- [ ] Form choice results проходят через тот же `validateDialogExecuteShape`
- [ ] Нарушения логгируются как `[FormChoicePipeline] Transform result validation warnings`

---

### 10. Finding: Validation strict mode policy (Низкий)

**Проблема:** `shouldEnforceTransformStrictMode()` читает `A2A_TRANSFORM_STRICT`, но:
- В dev по умолчанию `false`
- Нет policy когда должен быть `true` (CI? production?)

**Код:** `transform-execute-validator.ts:246-259`

**Предложение:**
- Документировать policy: `A2A_TRANSFORM_STRICT=1` в CI gates
- Добавить `--strict` flag в `run-all.mjs` для Mama tests
- Env matrix: dev (warn) → CI (strict throw) → prod (warn + metrics)

**Acceptance:**
- [ ] DOC: `docs/ENV-MATRIX.md` обновлен с policy
- [ ] Mama tests поддерживают `STRICT_MODE=1`
- [ ] CI скрипт устанавливает `A2A_TRANSFORM_STRICT=1`

### 11. Gap: Black Room (Algorithm Mode) Validation (Средний)

**Проблема:** Black Room (`black-room-orchestrator.ts`) реализует детерминированные алгоритмы, но нет unit/integration тестов для самого оркестратора, и нет Mama fixtures для `algorithm_invoke` gray room handler.

**Код:** `a2a-server/src/services/core/black-room/black-room-orchestrator.ts` содержит логику ретраев, валидации output, и построения prompt.

**Предложение:**
- Написать unit test для `BlackRoomOrchestrator` (mocking `fetch` to Ollama)
- Добавить `algorithm_invoke` в `validate-gray-room-horizontal.mjs`

**Acceptance:**
- [ ] `black-room-orchestrator.test.ts`
- [ ] Golden fixture для `algorithm_invoke`

---

### 12. Gap: Client API Error Recovery (Низкий)

**Проблема:** В `step-routes-dialog-flow.js:435` при ошибке парсинга ответа от сервера клиент сохраняет step с `error: parseErrMsg || 'A2A invoke failed'` и возвращает 502. Нет тестов на то, как UI/Client API восстанавливается после 502 или malformed JSON от сервера.

**Предложение:**
- Добавить Papa test (или mock server test) на 502 Bad Gateway
- Проверить, что сессия не ломается навсегда (stuck step)

---

## Следующие шаги (обновленный порядок после extended поиска)

### P0 (Блокирующие)
1. **Missing execute shape validators** — добавить `TOP_LEVEL_MESSAGE_WITH_TOOL` и др. в `transform-execute-validator.ts`
2. **Form-choice pipeline validation** — execute shape checks для router choices

### P1 (Высокий)
3. **Sticky router Mama check** — localized debugging
4. **Gray room real fixtures** — 3 missing handlers (`compress_history`, `clarify`, `algorithm_invoke`)

### P2 (Средний)
5. **Tier policy** — CI optimization
6. **Validator migration** — cleanup debt (объединить validators)
7. **Strict mode policy** — документировать когда `A2A_TRANSFORM_STRICT=1`
8. **Black Room Validation** — тесты для `black-room-orchestrator.ts`

### P3 (Низкий / Future)
9. **Client API Error Recovery** — тесты на 502/malformed
10. **RAG pagination / read-file queue** — когда понадобятся для feature work

---

## Идеальные варианты реализации (после глубокого анализа)

### Вариант А: Unified Session Auditor (рекомендуемый)

**Суть:** Один сканер `audit-sessions.mjs` вместо 3 отдельных.

**Обнаруживает:**
1. **Sticky router** — цепочка `router → choice → (processing) → target`
2. **Execute shape** — single-key rule, top-level message conflicts
3. **Gray room gaps** — отсутствие `interruptTrace` в agent-mode сессиях

**Выход:**
```json
{
  "sessionsScanned": 50,
  "violations": [
    {"sessionId": "sess_abc", "step": 2, "type": "STICKY_ROUTER", "severity": "high"},
    {"sessionId": "sess_xyz", "step": 5, "type": "MULTI_KEY_EXECUTE", "keys": ["message", "read-file"]}
  ],
  "driftRate": { "STICKY_ROUTER": 0.04, "MULTI_KEY_EXECUTE": 0.12 },
  "recommendation": " Prioritize MULTI_KEY_EXECUTE fixes (12% drift)"
}
```

**CLI:**
```bash
node audit-sessions.mjs --source=sessions --threshold=5 --format=json
```

---

### Вариант Б: Live Drift Detector (CI интеграция)

**Суть:** Постоянный мониторинг — после каждого `POST /next` валидировать response.

**Преимущества:**
- Обнаружение в реальном времени
- Контекст для дебага (full session state при нарушении)

**Недостатки:**
- Требует интеграции в Client API
- Performance overhead

**Применение:** Debug mode только (`DEBUG_VALIDATE=1`).

---

### Вариант В: Simulation-First Testing (preventive)

**Суть:** Добавить gray-room traces во все agent simulations.

**Чеклист:**
- [ ] `agent/1` → `agent/2` — проверить sticky router (router → agent)
- [ ] `interrupt-thinking/*-sub-*` — validate full interrupt chain
- [ ] Добавить `compress_history` fixture
- [ ] Добавить `algorithm_invoke` fixture

**Acceptance:** Все simulations проходят через `validate-gray-room-horizontal.mjs`.

---

### Матрица выбора

| Сценарий | Вариант | Приоритет |
|----------|---------|-----------|
| Ночной аудит storage | A (Unified) | P0 |
| Debug stuck сессии | B (Live) | P1 |
| CI gate | A (Unified) + C (Simulation) | P0 |
| Regression prevention | C (Simulation-First) | P1 |

---

## Связанные документы

- [`PAPA-MAMA.md`](../../PAPA-MAMA.md) — методология
- [`tests/indirect-tests/README.md`](../../tests/indirect-tests/README.md) — Mama текущий state
- [`tests/direct-tests/README.md`](../../tests/direct-tests/README.md) — Papa текущий state + hardening
- [`tests/direct-tests/validators/README.md`](../../tests/direct-tests/validators/README.md) — кандидаты миграции

---

## История изменений

| Дата | Что добавлено |
|------|---------------|
| 2026-04-04 | Начальная версия после реализации матрицы |
| 2026-04-04 | Детализация п.1 (sticky router scanner: logic, flags, threshold) |
| 2026-04-04 | Детализация п.3 (execute shape scanner: drift rate, triggers, report-by-action) |
| 2026-04-04 | Глубокий анализ: gray-room traces (3/6 handlers covered), execute shape scan (0 violations), state transition logic, runtime validators inventory |
| 2026-04-04 | Extended deep search: found validator gaps (TOP_LEVEL_MESSAGE*, EXECUTE_MESSAGE_ONLY not in transform-execute-validator.ts), form-choice validation, simulation validation |
