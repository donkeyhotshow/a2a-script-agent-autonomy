# Идеи оптимизации — A2A Script Agent

---
doc:
  id: optimization-ideas
  type: proposals
  machine_readable: true
  created: 2026-04-19
  tags: [optimization, refactoring, cleanup, architecture]
---

Документ зафиксирован по итогам полного аудита проекта (2026-04-19).
Каждая идея сопровождается приоритетом (P0–P2) и объёмом усилий (S/M/L).

---

## 1. Консолидация дублирующихся import-fix скриптов (P1, S) ✅ исправлено

~~В `scripts/` существовало 6 вариантов скриптов для исправления импортов.~~
Исправлено: 5 устаревших скриптов (`fix-imports.js`, `fix-imports-action.js`,
`fix-imports-manual.js`, `fix-server-imports.cjs`, `fix-server-imports.mjs`) перенесены в
`scripts/_deprecated/`. Остался один канонический: `scripts/fix-imports-direct.mjs`
(`npm run fix-imports:direct`).

---

## 2. Корневой Next.js shell — активно используется ✅ анализ завершён

**Факты (2026-04-19):** `app/`, `components/`, `hooks/`, `lib/` — **не остатки**, это рабочий
оператор UI на базе Next.js 16. Он включает:
- `app/api/a2a/[...path]/route.ts` — прокси-маршрут, перенаправляющий все `/api/a2a/*`
  запросы на Client API (`localhost:3001`)
- `app/page.tsx` — Chat UI с `SessionPanel`, `ChatPanel`, `Workbench`
- `hooks/use-a2a-session.ts` — управление сессиями
- `lib/api-client.ts` — типизированный клиент Client API
- `npm run dev/build/start` — все эти команды запускают Next.js

`react`/`react-dom`/`next` в `dependencies` — **корректны** для этого shell.

**Итог:** Удалять нельзя. Это второй оператор UI (Next.js) рядом с первым (Vue/Vite в
`a2a-client/packages/web`). При желании можно вынести в `packages/operator-ui`, но это
опциональный рефакторинг.

---

## 3. Унификация lock-файлов (P1, S) ✅ исправлено

~~`pnpm-lock.yaml` в корне и `a2a-server/` конфликтовал с `package-lock.json`.~~
Исправлено: `pnpm-lock.yaml` удалён из git, добавлен в `.gitignore`.

---

## 4. Вынести `src/rateLimiter.js` в нужный пакет (P2, S) ✅ исправлено

~~Одиночный файл `src/rateLimiter.js` находился в корне в папке `src/`, не соответствуя
структуре монорепозитория. Импортировался через 4 уровня вверх из `registry-v2.ts`.~~

Исправлено:
- `src/rateLimiter.js` → `_deprecated/src/rateLimiter.js`
- Создан `a2a-server/packages/server-utils/src/rate-limiter.ts` (typed TypeScript)
- Добавлен в `a2a-server/packages/server-utils/src/index.ts` (публичный экспорт)
- `registry-v2.ts` импортирует из `../../server-utils/src/rate-limiter.js`

---

## 5. Снизить количество пакетов `a2a-server` путём группировки (P2, L) — частично ✅

**Было:** 18 физических директорий в `packages/`, 12 официальных workspace-пакетов + 6 "ghost"
 директорий без `package.json` или регистрации в workspaces.

**Сделано (2026-04-19):**
- `packages/artifact-validator/` (пустая) — удалена
- `packages/agents/` (только .md-файлы, 0 .ts) → `_deprecated/packages/agents/`
- `packages/lib/` (build artifacts, дубликат `server-utils/src/`) → `_deprecated/packages/lib/`
  Все импорты `../lib/X.js` → `../server-utils/src/X.js` исправлены автоматически (28 файлов)
- `packages/memory/` (3 .ts с двойным `src/src/` путём) → `_deprecated/packages/memory/`
- `packages/features` — зарегистрирован в workspaces (package.json уже был)
- `packages/services` — создан `package.json` + зарегистрирован в workspaces
- Добавлены `ioredis`, `playwright`, `litellm` в `a2a-server/package.json`
- `litellm` добавлен в `packages/llm/package.json`

**Итог:** 14 физических пакетов, 14 зарегистрированных workspace-пакетов (было 12), 0 ghost dirs.

**Оставшаяся P2/L работа (требует миграции импортов):**
- `daemon` (10 файлов) + `features` (6 файлов) → `server-runtime`
- `llm` (9 файлов) + `transform` (18 файлов) → `server-ai`
- `config` (legacy) + `server-config` → слияние в `server-config`
- `protocol` (legacy, 11 файлов) + `server-protocol` (1 файл) → слияние в `server-protocol`

---

## 6. Тип зависимостей в корневом `package.json` (P1, S) ✅ исправлено

~~В корневом `package.json` часть библиотек находилась в `dependencies`, хотя использовалась
только в `a2a-server` или нигде.~~

**Сделано (2026-04-19):** Корень НЕ является npm workspace — каждый суб-пакет (`a2a-server`,
`a2a-client`, `telegram-bot`) управляет зависимостями самостоятельно.

- **Удалены** из root `dependencies` (не используются нигде в активном коде):
  `libp2p`, `@chainsafe/libp2p-gossipsub`, `@chainsafe/libp2p-noise`, `@libp2p/mplex`,
  `@libp2p/tcp`, `@langchain/langgraph`, `typescript-json`, `a2a-js`
- **Удалены** из root (принадлежат `a2a-server`, у которого свой `package.json`):
  `express`, `express-async-errors`, `cors`, `helmet`, `compression`, `bcrypt`, `bullmq`,
  `multer`, `jsonwebtoken`, `ioredis`, `litellm`, `playwright`, `winston`,
  `winston-daily-rotate-file`, `prom-client`, `loro-crdt`
- **Перемещён** `@types/commander` из `dependencies` → `devDependencies`
- **Оставлены** в root (используются в корневом коде):
  `next`, `react`, `react-dom`, `@tailwindcss/postcss`, `axios`, `commander`, `glob`, `zod`

---

## 7. Monitor-artifacts не должны попадать в git (P0, S) ✅ исправлено

~~`monitor-artifacts/` включён в git (runtime output).~~ Исправлено добавлением в `.gitignore`.

---

## 8. Session storage не должен попадать в git (P0, S) ✅ исправлено

~~`a2a-client/storage/` (471 файл) был в git, несмотря на наличие записи в `.gitignore`.~~
Исправлено через `git rm --cached -r a2a-client/storage/`.

---

## 9. Консолидация DEV_STATE документов (P2, S)

**Проблема:** DEV_STATE разбросан по нескольким файлам:
- `DEV_STATE.md` (корень — pointer)
- `docs/DEV_STATE.md`, `docs/DEV_STATE_ROOT.md`, `docs/DEV_STATE_AIHUB.md`, `docs/DEV_STATE_SERVER.md`
- `a2a-server/DEV_STATE.md`

**Предложение:** Сохранить каноническую иерархию (root → module), но убрать дублирование
в `docs/DEV_STATE.md` (совпадает с `docs/DEV_STATE_ROOT.md`).

---

## 10. Оптимизация граф зависимостей (P2, M) ✅ исправлено

~~Корневой `package.json` перечислял тяжёлые зависимости (`@langchain/langgraph`, `libp2p`,
`loro-crdt`), которые не использовались нигде в активном коде.~~

Исправлено как часть п.6: все неиспользуемые и неправильно размещённые зависимости удалены
из корневого `package.json`. Корень имеет только 8 зависимостей для Next.js shell и
root-level tools. `npm install` больше не тащит сотни MB неиспользуемых пакетов.

---

## 11. Переименование `a2a-ai-hub` → `ai-hub` (P3, M)

**Проблема:** `a2a-ai-hub` — избыточный префикс. Папка уже находится в корне репозитория
`a2a-*`, двойной префикс создаёт путаницу.

**Предложение:** Только при следующем крупном рефакторинге.

---

## Итоги аудита 2026-04-19

| Категория | Найдено | Статус |
|-----------|---------|--------|
| Артефакты в git (sha-файлы, логи, build-артефакты) | 12 файлов | ✅ Удалены |
| Session storage в git | 471+ файлов | ✅ Удалены |
| Monitor artifacts в git | 12 файлов | ✅ Удалены |
| Stale migration docs | 3 файла | ✅ Удалены |
| `.gitignore` — пропущенные паттерны | 10 паттернов | ✅ Добавлены |
| `docs/ARCHITECTURE.md` — устаревшие ASCII-диаграммы | — | ✅ Обновлены (Mermaid) |
| Дублирующиеся import-fix скрипты | 5 скриптов | ✅ Перенесены в `scripts/_deprecated/` |
| `src/rateLimiter.js` в корне | — | ✅ → `server-utils/src/rate-limiter.ts` |
| `pnpm-lock.yaml` в git | 2 | ✅ Удалены из git, добавлены в `.gitignore` |
| Next.js shell в корне | — | ✅ Проанализирован, активно используется |
| Ghost-директории в `a2a-server/packages/` | 4 (artifact-validator, agents, lib, memory) | ✅ → `_deprecated/packages/` |
| Импорты `../lib/X.js` в 28 файлах | — | ✅ → `../server-utils/src/X.js` |
| `packages/features` не в workspaces | — | ✅ Зарегистрирован |
| `packages/services` без package.json | — | ✅ Создан + зарегистрирован |
| Root `dependencies` — неиспользуемые/чужие пакеты | 24 | ✅ Удалены (8 неиспользуемых + 16 из a2a-server) |
| `@types/commander` в dependencies | — | ✅ Перемещён в devDependencies |
| `ioredis`, `playwright`, `litellm` не задекларированы в a2a-server | 3 | ✅ Добавлены |
| `litellm` не задекларирован в llm/package.json | — | ✅ Добавлен |
| Слияние мелких пакетов (`daemon`+`features`, `llm`+`transform`, `config`+`server-config`, `protocol`+`server-protocol`) | 4 пары | ⏳ P2/L, требует миграции импортов |
