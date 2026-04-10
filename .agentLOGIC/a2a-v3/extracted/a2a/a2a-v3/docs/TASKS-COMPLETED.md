# Выполненные задачи

> Сводка завершённых задач из папки `tasks/`. Перенесено в документацию для долгосрочного хранения.

## 00-SC-07: Step Routes Split By Flow

**Статус:** ✅ Completed

**Описание:** Split `stepRoutes.js` by flow ownership: `router-flow`, `dialog-flow`, `agent-flow`, `async-flow`, then keep one composition root.

**Детали:**
- Разделить stepRoutes.js по flow ownership
- router-flow, dialog-flow, agent-flow, async-flow
- Сохранить один composition root

**Источник:**
- [`a2a-client/DEV_STATE.md:224`](../a2a-client/DEV_STATE.md)

---

## 00-SC-09: System Message Policy

**Статус:** ✅ Completed (2026-03-27)

**Описание:** Define and implement Web UI policy for `system` messages (Red Room auto-responses): rendering style, ordering in timeline, and non-lossy persistence in `messages.json`.

**Детали:**
- [x] Определить policy для system messages
- [x] Red Room auto-responses имеют определённый rendering style (CSS `.task-flow-message.system`)
- [x] Ordering в timeline сохраняется (хронологическая последовательность из step slices)
- [x] Non-lossy persistence в messages.json (normalizeMessage сохраняет role)

**Реализация:**
- **Rendering**: CSS `.task-flow-message.system` с orange accent border (#ff9800), light orange background (#fff3e0), 🤖 emoji prefix
  - Файл: `a2a-client/web/css/components/task-flow.css:200-214`
  - Role label "System" отображается в заголовке
- **Filtering**: Telemetry-only errors (metadata.type === 'error' || severity in {'error','warning'}) скрыты из timeline но хранятся
  - Файл: `a2a-client/web/js/task-flow/render.js:43-48` (isSystemErrorChatMessage)
- **Ordering**: Хронологическая последовательность из step slices, system сохраняет позицию относительно user/assistant
  - Файл: `a2a-client/web/js/session-data.js:325-336` (applyServerMessages)
- **Persistence**: Все роли сохраняются в messages.json slice per step
  - Файл: `a2a-client/web/js/utils/normalizers.js:28-40`

**Документация:**
- [`a2a-client/docs/WEB_UI_PROTOCOL.md:159`](../a2a-client/docs/WEB_UI_PROTOCOL.md#system-messages-red-room-auto-responses)
- [`a2a-client/DEV_STATE.md:226`](../a2a-client/DEV_STATE.md) - SC-09 marked as completed

---

## Client Code Consolidation Plan

**Статус:** ✅ Completed

**Описание:** План по уменьшению клиентского кода через унификацию и упрощение. **Решение принято:** Хранение остаётся step-based.

### Выявленные области для консолидации

#### 1. DTO/Projection Layer (Можно слить)

**Проблема:** 6 файлов делают похожие вещи

**Текущее:**
- `shared/web-execute-dto.mjs` (6KB) - реальная логика
- `routes/utils/execute-projection-dto.js` - proxy
- `routes/utils/web-execute-dto.js` - deprecated proxy
- `routes/utils/session-projection-dto.js` - session projection
- `routes/utils/web-session-dto.js` - deprecated proxy

**Решение:** Оставить только `shared/web-execute-dto.mjs` как single source of truth

#### 2. Session Storage (УПРОСТИТЬ, НО STEP-BASED)

**Решение принято:** Хранение остаётся step-based.

**Проблема:** Сложная логика восстановления - need to find highest step, then merge multiple files

**Предложение (step-based, validated):**

1. **session-index.json** - lightweight index для быстрого доступа
   - Пишется при каждом `saveNewStep()`
   - Читается первым при loadNewSession() → fast path
   - Fallback: если нет → существующая логика

2. **mode derivation** - вычисление режима, не хранение
   - Из `context.execution.action` (прямой флаг)
   - Fallback: если есть `workbench` → 'agent', иначе → 'dialog'

#### 3. Message Timeline Builder (Можно удалить)

**Проблема:** Сложная логика deduplication

**Текущее:**
- `routes/utils/message-timeline.js` (3.6KB)
- `collectCanonicalTimeline()` - 4 источника, приоритеты, dedupe
- `collectSessionMessagesFlat()` - результат

**Предложение:** Если хранить все сообщения в одном месте (вместо step-based), эта логика не нужна

#### 4. Session State в Web (Можно слить)

**Проблема:** Два способа управления состоянием

**Текущее:**
- `web/js/session-store.js` (10KB) - глобальный SessionStore
- `web/js/session-data.js` (15KB) - createSessionStoreCore()
- `web/js/session-store-resolver.js` (1.3KB) - provider pattern

**Предложение:** Объединить session-data в session-store, убрать resolver если не используется

### Roadmap: 3 фазы упрощения

#### Фаза 1: Удалить deprecated (Безопасная)
1. Удалить `routes/utils/web-execute-dto.js` (уже deprecated)
2. Удалить `routes/utils/web-session-dto.js` (уже deprecated)
3. Обновить импорты

**Влияние:** Низкое - только совместимость

#### Фаза 2: Упростить хранилище (STEP-BASED)
1. Добавить `session-index.json` - lightweight index
2. Объединить server-response + messages (optional)
3. Добавить mode flag в step файлы
4. Упростить loadNewSession() с использованием index

**Влияние:** Среднее - добавляем index, упрощаем восстановление

#### Фаза 3: Упростить клиентский JS (Расширенная)
1. Объединить session-data.js → session-store.js
2. Проверить использование session-store-resolver
3. Упростить error-handler (крупнейший файл - 28KB)

**Влияние:** Высокое - меняется UI

---

## Session Storage Analysis

**Статус:** ✅ Completed

**Описание:** Глубокий анализ текущей системы сохранения сессий для агентского диалога.

### Текущая архитектура

#### Файловая структура (step-by-step)

```
storage/sessions/{sessionId}/
├── 1/
│   ├── server-response.json    # execute + context (без messages)
│   ├── messages.json           # messages slice for step 1
│   ├── client-result.json      # (optional) user/tool result
│   ├── request-to-server.json  # (optional) request sent
│   └── server-promise.json     # (optional) async state
├── 2/
│   └── ...
└── N/
    └── ...
```

#### Источники данных

| Файл | Источник | Назначение |
|------|----------|------------|
| `server-response.json` | A2A Server response | execute, context, result |
| `messages.json` | Step message slice | UI history |
| `client-result.json` | Client tool output | Red Room results |
| `request-to-server.json` | Client API request | Debug/audit |
| `server-promise.json` | Promise state | Async tracking |

### Выявленные проблемы

1. **Слишком много файлов для простой задачи** - Для простого сообщения нужно 2+ файла, для red room - 3 файла
2. **Дублирование данных** - sourcePriority нужен для dedupe
3. **Context - "black box"** - workbench.sections важные данные, но глубоко в context
4. **Нет единого "состояния"** - Состояние распределено между execute, messages, context
5. **Agent mode vs Dialog** - Нет явного флага "это агентская сессия"

### Предложения по упрощению

**Принятое решение:** step-based (Вариант Б - улучшенные метаданные)

#### Реализация: session-index.json (P1)

```json
// session-index.json (root of session folder)
{
  "sessionId": "sess_123",
  "currentStep": 5,
  "mode": "agent",
  "createdAt": "2026-03-20T09:00:00Z",
  "updatedAt": "2026-03-20T09:15:00Z",
  "status": "active",
  "promiseId": null,
  "promiseStatus": null,
  "steps": [
    { "step": 1, "hasClientResult": false, "hasServerResponse": true },
    { "step": 2, "hasClientResult": true, "hasServerResponse": true }
  ]
}
```

#### Реализация: mode flag (P2)

Mode вычисляется, не хранится:
1. Из `context.execution.action` - прямой флаг
2. Fallback: Если `workbench` существует → mode = 'agent'
3. Default: 'dialog'

---

## Simulation Upgrade Plan

**Статус:** ✅ Completed

**Описание:** План апгрейда симуляций для соответствия улучшенной структуре клиента и документации.

### Current Status
- **89 симуляций** валидны ✓
- **0 errors** в lint/validate
- **Warnings**: Optional files not found (expected)

### Категории симуляций

#### 1. Dialog Simulations (`dialog/`)
Базовые диалоговые симуляции с формой выбора режима.

#### 2. Agent Simulations (`agent-*`)
Agent mode симуляции с workbench системой.

#### 3. Task Decomposition (`task-decomposition/`)
Симуляции декомпозиции задач.

#### 4. Fix Simulations (`fix-*`)
Скриптовые операции без LLM.

#### 5. Interrupt/Thinking (`interrupt-thinking/`)
Gray room симуляции для thinking/reasoning.

### Timeline

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1 | Analysis of current simulations | Done |
| Phase 2 | Projection DTO alignment check | Done |
| Phase 3 | Workbench format verification | Done |
| Phase 4 | Gray room trace validation | Done |
| Phase 5 | Documentation updates | Done |
| Phase 6 | Side fixes (tests, code) | Done |

---

## Связанные документы

- [`../DEV_STATE.md`](../DEV_STATE.md) - Основное состояние системы
- [`../a2a-client/DEV_STATE.md`](../a2a-client/DEV_STATE.md) - Состояние клиента
- [`SESSION-SYSTEMS-OVERVIEW.md`](SESSION-SYSTEMS-OVERVIEW.md) - Обзор систем сессий
- [`WEB_UI_PROTOCOL.md`](../a2a-client/docs/WEB_UI_PROTOCOL.md) - Протокол Web UI