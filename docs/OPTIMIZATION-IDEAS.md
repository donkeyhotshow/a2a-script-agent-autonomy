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

## 1. Консолидация дублирующихся import-fix скриптов (P1, S)

**Проблема:** В `scripts/` существует 6+ вариантов скриптов для исправления импортов:
`fix-imports.js`, `fix-imports-action.js`, `fix-imports-direct.mjs`, `fix-imports-manual.js`,
`fix-server-imports.cjs`, `fix-server-imports.mjs`.

**Предложение:** Оставить один канонический скрипт (`fix-imports-direct.mjs`), остальные
перенести в `_deprecated/` или удалить. Текущее исполнение: `npm run fix-imports:direct`.

---

## 2. Корневой Next.js shell — решить судьбу (P1, M)

**Проблема:** В корне репозитория есть `app/`, `components/`, `hooks/`, `lib/`, `next.config.mjs`,
`postcss.config.js` — остатки Next.js shell. Реальный фронтенд живёт в `a2a-client/packages/web`
(Vue + Vite). Корневые `devDependencies` включают `next`, `react`, `react-dom`.

**Предложение:**
- Если Next.js shell не используется — удалить `app/`, `components/`, `hooks/`, `lib/`,
  `next.config.mjs`; убрать `next`/`react`/`react-dom` из корневого `package.json`.
- Если shell нужен — вынести в отдельный пакет `packages/operator-ui`.

---

## 3. Унификация lock-файлов (P1, S)

**Проблема:** В корне одновременно присутствуют `package-lock.json` и `pnpm-lock.yaml`.
Аналогичная ситуация в `a2a-server`. Это вызывает неоднозначность при установке зависимостей.

**Предложение:** Выбрать один менеджер пакетов (рекомендуется `npm` как уже используемый
в CI) и удалить `pnpm-lock.yaml` из корня и `a2a-server/`, добавив их в `.gitignore`.

---

## 4. Вынести `src/rateLimiter.js` в нужный пакет (P2, S)

**Проблема:** Одиночный файл `src/rateLimiter.js` находится в корне репозитория в папке `src/`,
что не соответствует структуре монорепозитория.

**Предложение:** Переместить в `a2a-server/packages/server-utils/src/` или
`a2a-client/packages/sdk/src/` в зависимости от использования.

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
| `.gitignore` — пропущенные паттерны | 8 паттернов | ✅ Добавлены |
| `docs/ARCHITECTURE.md` — устаревшие ASCII-диаграммы | — | ✅ Обновлены (Mermaid) |
| Дублирующиеся import-fix скрипты | 6 скриптов | ⏳ P1, требует ручной проверки |
| Next.js shell в корне | — | ⏳ P1, требует решения |
| Дублирование lock-файлов | 2 | ⏳ P1, требует решения |
