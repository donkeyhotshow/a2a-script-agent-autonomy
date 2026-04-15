# Import migration board (Stage 2)

Цель: нормализовать import model, убрать deep relative cross-package imports и перевести потребителей на package imports через публичные entry points.

**Снимок состояния (2026-04-13):** workspace-пакеты и `a2a-client/packages/web` на месте; **миграция импортов и зелёная сборка `a2a-server` не закрыты**. Ниже — факт и приоритеты.

## Package owner map

### a2a-server (workspace)

| Пакет | Путь |
|-------|------|
| `@a2a/config` | `a2a-server/packages/server-config/` |
| `@a2a/server-protocol` | `a2a-server/packages/server-protocol/` |
| `@a2a/server-utils` | `a2a-server/packages/server-utils/` |
| `@a2a/server-daemon` | `a2a-server/packages/daemon/` |
| `@a2a/server-request` | `a2a-server/packages/request/` |
| `@a2a/server-features` | `a2a-server/packages/features/` |
| **`@a2a/server-core`** | `a2a-server/packages/server/` |
| **`@a2a/server-actions`** | `a2a-server/packages/actions/` |
| **`@a2a/server-llm`** | `a2a-server/packages/llm/` |
| **`@a2a/server-transform`** | `a2a-server/packages/transform/` |
| **`@a2a/server-gray-room`** | `a2a-server/packages/gray-room/` |

`@a2a/server-features` зависит от `@a2a/server-core` через `file:../server` — **корректно**.

### Общий код вне пакетов

- **`a2a-server/packages/lib/`** — сейчас тянется через относительные пути (`../../../lib/...`) из `server`, `gray-room`, `protocol`, `request` и **через реэкспорт** в `server-utils/src/index.ts`. Это отдельная волна: либо перенос владения в `@a2a/server-utils`, либо отдельный пакет, с единым публичным API (см. приоритет P0/P5).

### a2a-client

- Канонический web root: **`a2a-client/packages/web/`** (`index.html`, `js/`, `css/`), Vite: `root: 'packages/web'`.

## Needed exports (запросы на публичный API)

### From `@a2a/server-transform`

- **types**: `InterruptDirective`, `ServerInterruptTraceEvent`, `GrayRoomControlEnvelope`, `GrayRoomContext`, константы вроде `SERVER_OWNED_WORKBENCH_SLOT_KEYS` / контракт interrupt-trace — по факту импортов в gray-room и дублирующем `client-visible-context`.
- **runtime**: `runPromptsTransform`, `runTransformPipelineFromFile`, `syncLiveContextHistoryFromResultMessage`, `getPromptsTransformsPath` (часть уже потребляется через пакет).

### From `@a2a/server-gray-room`

- `GrayRoomOrchestrator`, `shouldUseGrayRoom`, `readGrayRoomInterruptBudget`, `readDialogHubLlmResubmitMax`, `isDialogToolExecutePayload`, и т.д. — сейчас часть вызовов всё ещё идёт в `../../../gray-room/src/...` из `server-core`.

### From `@a2a/server-actions`

- `actionProcessor`, `actionRegistry`, `ActionDefinition`, `executeMcpCall`, публичный barrel вместо `server/src/actions/index.ts` → `../../../actions/src/...`.

### From `@a2a/server-utils`

- Корень пакета для `pathIsAccessible`, `deepCloneJson`, `logger` subpath; для **P0** нужно разрулить компиляцию без выхода `rootDir` наружу и без цикла `lib` ↔ `daemon`.

## Claimed files (first wave) — статус

| Зона | Файл | Статус |
|------|------|--------|
| A gray-room | `gray-room-interrupt-handlers/algorithm-invoke.ts` | **open** — всё ещё `../../../../../transform/src/types.js` |
| A gray-room | `base-handler.ts`, `clarify.ts`, `compress-history.ts` | **open** — тот же паттерн |
| B server | `request-processor.service.ts` | **open** — deep import `gray-room/src/.../gray-room-orchestrator.js` |
| B server | `base-processor.ts` | проверить при следующем проходе (не в списке grep deep `*/src` от 2026-04-13) |
| C | `actions/src/action-processor.ts` | частично — зависимости на `@a2a/server-core`; сборка actions падает без корректного разрешения core |
| C | `transform/src/pipeline/prompts.ts` | **сделано** — `@a2a/server-utils` / `logger` |
| E client | `vite.config*`, web tree | **сделано** — `packages/web` существует |

## Completed migration waves

- **Частично (без закрытия волны):** объявлены workspace-пакеты `server`, `actions`, `llm`, `transform`, `gray-room`; часть кода уже на `@a2a/server-transform` / `@a2a/server-actions` / `@a2a/server-llm` (например `gray-room-orchestrator.ts`, часть interrupt handlers, `response-path` частично).
- **Полных волн с зелёной сборкой и записью в Wave log — пока нет.**

## Open blockers

1. **`@a2a/server-protocol-legacy`** (`packages/protocol`): `tsc` без отдельного `tsconfig` тянет `../actions` и падает на `@a2a/server-core` / пакетных импортах — чинить отдельно (path maps или изолированный проект).
2. **`@a2a/config-legacy`**: известные ошибки типов / отсутствующие модули — вне текущей волны.
3. **Дубликат/наследие:** `a2a-server/packages/server/request/client-visible-context.ts` (вне `src/`) с импортом в `packages/transform/src/...` — слить или удалить после проверки ссылок.
4. **Compat barrel:** `server/src/actions/index.ts` реэкспортит `../../../actions/src/index.js` — убрать в пользу `@a2a/server-actions` у потребителей.

## Приоритет оставшихся импортов (backlog)

Правило: новый export → строка в **Needed exports** → правка owning package → миграция потребителя.

### P0 — разблокировать сборку (инфраструктура) — **сделано (2026-04-13)**

- Логика **hub promise** перенесена в `@a2a/server-utils` (`src/llm-hub-promise.ts`, `src/ai-hub-url.ts`, `src/ai-hub-chat-sync.ts`); `@a2a/server-daemon` только оборачивает `pollReadyThenFetch` (patch контекста через `@a2a/server-request`).
- **`packages/lib/ai-hub-url.ts`** и **`ai-hub-chat-sync.ts`** — тонкие re-export на `server-utils` для старых относительных путей.
- **`@a2a/server-request`**: re-export ошибок с `@a2a/server-utils` вместо `packages/lib/errors.ts`.
- **Сборка по волнам:** `a2a-server/package.json` → `npm run build` = `node scripts/build-workspaces-ordered.mjs` (порядок: utils → request → daemon → core → actions/llm/transform → gray-room). Параллельный вариант: `npm run build:parallel`.
- **`@a2a/server-actions`**: `tsconfig` `paths` → `../server/dist/public/index.d.ts` для стабильного разрешения `@a2a/server-core` при `tsc` (без подтягивания исходников сервера в `rootDir` actions).

### P1 — заявленная волна gray-room (типы transform)

Заменить на `@a2a/server-transform` (type-only / публичный export):

- `gray-room/.../algorithm-invoke.ts`
- `base-handler.ts`, `clarify.ts`, `compress-history.ts`

### P2 — server-core: убрать deep `*/src` соседей

Минимальный набор по grep2026-04-13:

- `response-path.ts`, `request-processor.service.ts`, `dialog-request-processor.ts` → `@a2a/server-gray-room`
- `action-request-processor.ts`, `sessions.routes.ts`, `handlers/task-request-handler.ts`, `handlers/step-result-handler.ts`, `evaluation/vision-tester.ts` → `@a2a/server-actions`
- `llm-orchestration.ts`, `form-choice-pipeline.ts` → `@a2a/server-transform`
- `tools-evolve.ts`, `mcp/registry.ts` → `@a2a/server-features` (публичные экспорты) или согласованный subpath

### P3 — тесты и второстепенные потребители

- `server/tests/.../definitions-load.test.ts` — deep path к `packages/actions/src/...`
- `features/tests/ai-hub-generate.test.ts` — deep import в `llm/src/...`

### P4 — волна `packages/lib` → пакеты

- Массовые `../../../lib/...` из `server/src/utils/*`, `gray-room`, `protocol`, `request` — после P0 решить единый владелец и мигрировать на `@a2a/server-utils` (или отдельный пакет), без реэкспорта «в обход» `rootDir`.

## Wave log (evidence)

| Дата | Волна | Команда | Итог |
|------|-------|---------|------|
| 2026-04-13 | (верификация) | `cd a2a-server && npm run build` | **FAIL**: `ai-hub-chat-sync` → daemon; `server-utils` `rootDir`; параллельные workspace без порядка зависимостей. |
| 2026-04-13 | P0 | `cd a2a-server && node scripts/build-workspaces-ordered.mjs` | **PASS**: `@a2a/config`, `@a2a/server-protocol`, `@a2a/server-utils`, `@a2a/server-request`, `@a2a/server-daemon`, `@a2a/server-core`, `@a2a/server-actions`, `@a2a/server-llm`, `@a2a/server-transform`, `@a2a/server-gray-room`. |

После следующей волны добавлять: список файлов, добавленные exports, повтор команды build + при необходимости lint/typecheck по затронутым workspace.
