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

## 5. Снизить количество пакетов `a2a-server` путём группировки (P2, L)

**Проблема:** `a2a-server/packages/` содержит ~19 пакетов, часть из которых (daemon, features,
lib, llm, memory, transform) имеют минимальный объём. Это увеличивает сложность граф зависимостей
и времени сборки.

**Предложение:** Рассмотреть слияние мелких пакетов:
- `daemon` + `features` → `server-runtime`
- `llm` + `transform` → `server-ai`
- `lib` + `server-utils` → `server-utils`

---

## 6. Тип зависимостей в корневом `package.json` (P1, S)

**Проблема:** В корневом `package.json` часть библиотек (например `express`, `bullmq`, `bcrypt`,
`libp2p`, `loro-crdt`, `langchain`) находится в `dependencies`, хотя фактически используются
только в дочерних пакетах (`a2a-server`, `a2a-client`).

**Предложение:** Проверить и перенести реально используемые в корне пакеты в `devDependencies`
или вовсе убрать из корня, оставив их только в конкретных workspace-пакетах.

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

## 10. Оптимизация граф зависимостей (P2, M)

**Проблема:** Корневой `package.json` перечисляет тяжёлые зависимости (`@langchain/langgraph`,
`libp2p`, `loro-crdt`), которые вероятно нужны только в `a2a-server`. Hoisting этих пакетов
в корень замедляет `npm install` для всех разработчиков.

**Предложение:** Провести аудит реального использования этих пакетов через `npm ls <pkg>` и
переместить в соответствующие workspace-пакеты.

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
| Снизить кол-во `a2a-server` пакетов | ~19 пакетов | ⏳ P2/L, требует ручного рефакторинга |
| Тяжёлые dep в корне `package.json` | libp2p, langchain и др. | ⏳ P2/M, требует аудита `npm ls` |
