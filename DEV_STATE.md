# DEV_STATE - 2026-03-27 (verified)

Current system state for production work. Methodology: always write DEV_STATE, always clean, always move forward.

---

## CRITICAL CHANGES

### 1. A2A Server - STATELESS

Сервер **не хранит сессии** - только обрабатывает запросы:
- Контекст сессии передаётся в каждом запросе
- Session storage перенесён в Client API

### 2. Keyword-Based Routing

Маршрутизация использует статический keyword matching:
- Конфигурация: [`a2a-server/src/config/router-static.ts`](a2a-server/src/config/router-static.ts)
- Fallback choices: hardcoded в panel-gateway.js

### 3. Action-Key Shape (MANDATORY)

```json
// CORRECT:
{ "execute": { "script": { ... } } }
{ "result": { "read-file": { "path": "...", "content": "..." } } }

// INCORRECT:
{ "execute": { "action": "read-file", "file": "..." } }
{ "result": { "content": "..." } }
```

---

## Code Refactoring (2026-03-27)

- Основные задачи по консолидации кода выполнены; помощьные детали сохранены в модульных `DEV_STATE.md` и `docs/`.
- Удалены дубли и выровнены imports для retry-логики, API-хелперов и shared типов.
- В этом документе оставляем только высокоуровневый статус и ключевые архитектурные решения.

---

## System Architecture

```
Web UI (5173) → Client API (5173/api/a2a) → A2A Server (3000, stateless) → AI Hub (11434)
Session Storage ← Client API ← Ollama (11435)
```

---

## Ports

| Port | Component | Role |
|------|-----------|------|
| 11435 | Ollama | Local LLM |
| 11434 | AI Integration | Proxy to Ollama |
| 3000 | a2a-server | API server (stateless) |
| 5173 | Vite | Web UI + Client API |

---

## Environment Variables

```
SKIP_AUTH=1
ENCRYPTION_KEY=<32-char>
JWT_SECRET=<32-char-min>
DEFAULT_SYNC_MODE=1
```

---

## Quick Start

```bash
start-all.bat
curl http://localhost:3000/health
curl http://localhost:5173/api/a2a/projects
cd ai-integration && docker-compose up -d
```

---

## Subsystems

| Module | State | Docs |
|--------|-------|------|
| a2a-client | [DEV_STATE.md](a2a-client/DEV_STATE.md) | [docs/](a2a-client/docs/) |
| a2a-server | [DEV_STATE.md](a2a-server/DEV_STATE.md) | [docs/](a2a-server/docs/) |
| ai-integration | [DEV_STATE.md](ai-integration/DEV_STATE.md) | [docs/](ai-integration/docs/) |

---

## Work Locks

| Lock | Status | Note |
|------|--------|------|
| ai-integration execution | UNBLOCKED (2026-03-27) | a2a-client and a2a-server tasks CM-10, CM-11, S-10, S-11 completed |

---

## Health Checks

```bash
curl http://localhost:3000/health              # A2A Server
curl http://localhost:11434/health             # AI Integration
curl http://localhost:11435/api/tags           # Ollama
curl http://localhost:5173/api/a2a/projects    # Client API
```

---

## Testing

```bash
# Simulations
npm run sim:lint -- --all --json
npm run sim:validate -- --all --json

# Unit tests
cd a2a-server && npm run test
cd a2a-client && npm test
```

---

## References

| Document | Purpose |
|----------|---------|
| [AGENTS.md](AGENTS.md) | Agent rules, Operational Protocol |
| [DOCUMENTATION-MACHINE-READABLE.md](docs/DOCUMENTATION-MACHINE-READABLE.md) | Doc standards |
| [simulations/SCHEMA.md](simulations/SCHEMA.md) | Simulation contract |
| [docs/ENV-MATRIX.md](docs/ENV-MATRIX.md) | Environment matrix |
| Module DEV_STATE | [a2a-client](a2a-client/DEV_STATE.md), [a2a-server](a2a-server/DEV_STATE.md), [ai-integration](ai-integration/DEV_STATE.md) |

---

## Известные проблемы

- `sim:validate` часто возвращает `valid` вместе с warning (`Optional file not found`) — это contract debt, не “clean” статус.
- [ИСПРАВЛЕНО] В таблице подсистем была ссылка на `ai-integration/DEV_STATE.md`, но файл отсутствовал - создан.
- [2026-03-27] Завершен блок `tasks/simulation-upgrade-plan.md` (docs/tests/code): добавлен `sim:workbench:validate`, обновлены `simulations/SCHEMA.md` и `simulations/README.md`, добавлены unit/integration checks в `a2a-client/tests/unit/*`.

---

## DEV_STATE Usage Rules

- **Source of truth:** каждый модуль ведет свой `DEV_STATE.md`; root фиксирует только кросс-модульные риски, решения и зависимости.
- **When to update:** обновлять в начале и в конце каждой рабочей сессии, плюс при любом изменении статуса риска/задачи.
- **Task quality:** каждая задача должна быть проверяемой (что сделать, где, как проверить), без общих формулировок.
- **Status model:** использовать два уровня качества для симуляций: `valid` (структурно) и `clean` (без warnings).
- **Ownership:** у каждой P0/P1 задачи должен быть владелец (модуль) и целевой этап (Phase / milestone).

## DEV_STATE Hygiene & Cleanup Requirements

- **Mandatory cleanup:** удалять устаревшие/дублирующие пункты после закрытия, не оставлять “мертвые” roadmap-элементы.
- **No contradiction:** нельзя одновременно держать “No active problems” и открытый технический долг в том же файле.
- **Link integrity:** каждая ссылка на модульный state-файл должна вести на существующий файл. Все DEV_STATE файлы должны быть пролинкованы между собой и с документацией (AGENTS.md, SCHEMA.md, docs/*).
- **Aging control:** задачи без обновления >14 дней переносить в отдельный backlog-блок с причиной блокировки.
- **Consistency check:** минимум раз в неделю сверять `DEV_STATE.md` ↔ `docs/DEV_STATE.md` ↔ `simulations/DEV_STATE.md`.

## Governance

**Responsibilities:**
- Update state after each significant action
- Mark complete, archive stale, lock decisions
- Closed-loop: analyze → execute → update → cleanup → plan → check readiness → repeat
- Document transitions with justification
- Sync parallel tracks (no logic conflicts)
- Track maturity: prototype → alpha → beta → release-candidate → production

**Strict Rules:**
- No abstract reasoning without state entry
- Every task has status
- Every completion is recorded
- Every uncertainty logged as risk/question

**Priority:**
1. Complete started work
2. Stabilize system
3. Prepare for production





## Технический долг и новые задачи

### Alternatives Migration Plan (cross-repo execution)
- [x] **A-01 session-storage-layout**: freeze canonical session layout (step dirs only), define allowed exceptions, and document migration path for legacy artifacts.
- [x] **A-02 golden-simulations**: set a single repo-wide quality gate (`valid` vs `clean`) and align CI commands/reporting to that gate.
- [x] **A-03 upstream-service-urls**: standardize service URL env matrix for dev/CI/prod (`A2A_SERVER_URL`, `AI_HUB_URL`, Ollama/Meili ports).
- [x] **A-04 workspace-rag-packaging**: choose one packaging strategy for workspace RAG (`file:` vs registry vs git) and pin owner + rollout steps.
- [x] **A-05 simulations-base-path**: decide default vs override behavior (`SIMULATIONS_PATH`) and sync scripts/docs with chosen mode.
- [x] **A-06 ts-module-policy**: lock NodeNext import policy (`.js` suffix) as enforced convention across server/client packages.
- [x] **A-07 llm-pipeline-modes**: define production mode set (dialog/agent/task-decomposition/auto-ai) with explicit enable criteria.

### Refactoring (Moderate)
- [x] `list-directory`: Перейти на нативный `readdir({recursive: true})` (Node.js 20+).
- [x] `list-directory`: Заменить самодельный regex на `picomatch` для полноценной поддержки glob.
- [x] `list-directory`: Добавить параметры `maxDepth` и `limit` для предотвращения перегрузки.
- [x] **R-01 legacy-bridge-cleanup (2026-03-27)**: удалены legacy-bridges из CDM-05:
  - loadLegacySession в newSessions.js
  - LEGACY_SESSION_STATUS enum в types.js
  - POST /sessions/:id/steps endpoint
  - deprecated функции в action-handler.ts
- [x] **R-02 dead-export-cleanup (2026-03-27)**: удалены dead exports:
  - router-static-choices.json (не импортировался)
  - tester/ (неработающий функционал)
- [x] **R-03 duplicate-adapter-cleanup (2026-03-27)**: консолидированы cleanup скрипты

### Simulation Contract & Docs (Complex)
- [x] Зафиксировать единый cross-repo baseline: что считаем “clean” для симуляций на уровне репозитория (`valid + 0 warnings` vs `valid + warnings`) и вынести это в единое правило для всех `DEV_STATE.md`.
- [x] Добавить агрегированный отчёт по долгам симуляций в root: топ-папки с warning-уровнем (например `orchestrator-dialog`, `phpunit-deprecations`, `task-decomposition`) и план снижения по итерациям.
- [x] Утвердить policy для golden-симуляций на уровне монорепо: полный pipeline или документированное исключение с owner/причиной/сроком.
- [x] Привязать roadmap из `simulations/SCHEMA.md` к межмодульным milestone (client + server): paginated RAG, read-file queue, human-gate chunking.
- [x] Синхронизировать state-документы модулей (`docs/DEV_STATE.md`, `simulations/DEV_STATE.md`, `a2a-client/DEV_STATE.md`, `a2a-server/DEV_STATE.md`) по единому шаблону статуса: Risks, Warning Debt, Next Tasks.

---

## Следующие задачи (Backlog, Cross-Module Only)

### Cross-Module Coordination
- [x] **CM-01**: Keep root/module state hierarchy clean: root stores only cross-module risks, decisions, and dependencies; implementation details stay in module `DEV_STATE.md`.
- [x] **CM-02**: Align simulation quality gate across modules (`valid` vs `clean`) and publish one acceptance rule for CI.
- [x] **CM-03**: Verify production env matrix consistency across client/server/ai-integration (`A2A_SERVER_URL`, `AI_HUB_URL`, auth flags, polling budgets). Baseline published in `docs/ENV-MATRIX.md`; root `.env.example` aligned (`POLL_TIMEOUT_MS=3600000`, `A2A_SERVER_URL` added).
- [x] **CM-04**: Track stage transition criteria (`beta` -> `release-candidate`) using aggregated evidence from all module states. Evidence report published: [`docs/STAGE-TRANSITION-CRITERIA.md`](docs/STAGE-TRANSITION-CRITERIA.md).
- [x] **CM-05**: Track client session-clarity alignment with simulation contracts (`simulations/dialog`, `simulations/agent-auto-ai`) and ensure no Web DTO regressions.
- [x] **CM-06**: Run quarterly cross-module redundancy review (duplicate abstractions, dead adapters, obsolete compatibility layers) and publish removal decisions in module states.
- [x] **CM-07**: Enforce tri-role dialogue contract (`user`/`assistant`/`system`) across client session storage and Web rendering; `system` messages represent Red Room auto-responses and must be preserved end-to-end.
- [x] **CM-08**: Remove duplicate/overlapping root session notes blocks and keep only cross-module facts in root history.
- [x] **CM-09**: Run docs encoding/terminology cleanup pass (mixed glyph artifacts, mixed-language drift) in high-impact protocol docs (`AGENTS.md`, Web protocol docs, simulation workflow docs).

### Code Cleanup Discovery Map (Where/How to Search)
- [x] **CDM-01 scope-map**: Each module keeps a target list of folders for cleanup scans (hotspots only, no broad random search). Completed 2026-03-27 — see `CCP-C-01`, `CCP-S-01`, `CCP-AI-01` in module `DEV_STATE.md` files.
- [x] **CDM-02 signal-set**: Search signals зафиксированы в каждом модуле (`CCP-C-02`, `CCP-S-02`, `CCP-AI-02`): duplicate adapters, legacy compatibility bridges, dead exports, unused route branches, overlapping DTO builders (2026-03-27).
- [x] **CDM-03 evidence-format**: For every cleanup candidate, record: `path`, `why redundant`, `usage proof`, `safe removal check` — documented per module (2026-03-27).
- [x] **CDM-04 acceptance-gate**: Removal only after module tests + simulation checks stay green — enforced via `CCP-C-05`, `CCP-S-04`, `CCP-AI-05` in module `DEV_STATE.md` (2026-03-27).

### Module Task Sources (No Duplication in Root)
- Client execution backlog: [`a2a-client/DEV_STATE.md`](a2a-client/DEV_STATE.md)
- Server execution backlog: [`a2a-server/DEV_STATE.md`](a2a-server/DEV_STATE.md)
- AI integration execution backlog: [`ai-integration/DEV_STATE.md`](ai-integration/DEV_STATE.md)
- **Atomic tasks:** see [`tasks/`](tasks/) directory for executable single-task documents

---

## 2026-03-27 Updates

- [x] **CDM-01** scope-map: all modules have `CCP-*-01 where-to-scan` in their `DEV_STATE.md`.
- [x] **CDM-02** signal-set: canonical five signals + module-specific ripgrep hints in `CCP-*-02` lines.
- [x] **CDM-03** evidence-format: four required fields per candidate in each module `DEV_STATE.md`.
- [x] **CDM-04** acceptance-gate: aligned with `CCP-*-05` / `CCP-S-04` safe-remove gates per module.
- [x] **LF-S-03** (`a2a-server`): `sim-validate` split into `scripts/sim-validate/{scanner,validators,reporters}.ts`; fixed repo-root paths for `simulations/` and `docs/…/json-schemas`.

- [x] **C-08** unified execute script API: public `execute.script` without `sandbox`; `result.script` includes `exitCode` in SDK handler paths (`a2a-client`).
- [x] Completed client task `C-03 sdk-http-limits` in `a2a-client` with standalone SDK defaults and env-overridable profile (CORS, rate-limit, file-cap) plus contract tests.
- [x] **CM-10**: Stabilize `session-index.json` and remove complex fallback in `newSessions.js` (Phase 2).
- [x] **CM-11**: Implement common Gray Room Orchestrator and move it out of specific processor.
- [x] **CM-12**: Add retention policy scripts for sessions and requests.

