# A2A Script Agent Glossary

## Core terms

| Term | Definition |
|------|-----------|
| **A2A (Agent-to-Agent)** | Protocol linking specialized agents through unified request/response structure and shared context |
| **Agent** | Autonomous component executing specific task (code analysis, proxying, testing, etc.) |
| **Session** | Logical chain of operations/messages between client and server; stores `context`, `execute`, `messages`, `stepNum` |
| **Promise/promiseId** | Async request identifier for polling status/result via `/api/v1/requests/{promiseId}/result` |
| **Action/Execute/Result** | Structured objects: `execute` from server (form/action/message), client responds `result`, action specifies operation |
| **Step storage** | Step folders in `a2a-client/storage/sessions/{sessionId}/{step}/` with `request-to-server.json`, `server-response.json`, `server-promise.json`, `messages.json` |
| **Auto mode** | Behavior when `execute` requires no user input (no form.input/form.choices); UI creates system messages and can continue automatically |
| **Workbench** | Structured state in `context.workbench.sections` |
| **Action-Key Shape** | Single action type per execute/result: `{ "execute": { "script": {...} } }` |
| **Black Room** | Черная комната: режим алгоритмического выполнения на локальном Local LLM upstream. Запускается через `interrupt.reason: "algorithm_invoke"` с `algorithmId`. Разделяет работу с Gray Room: Prompt Mode (платный API для стратегии) vs Algorithm Mode (бесплатный локальный LLM для выполнения). См. [ADR-0058](docs/adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md) |
| **Gray Room** | Серая комната: серверная цепочка LLM-вызовов (compress_history, thinking, auto_rag_page, auto_read_file, clarify) перед возвратом клиенту. Если **`interrupt`** нет: у **agent-class** схем опционально **syndicate / SIEGE_REVIEW**, когда **`result.completed === true`** (из JSON модели **`completed`**); у **dialog** эта ветка без syndicate. См. [`a2a-server/docs/GRAY-ROOM.md`](a2a-server/docs/GRAY-ROOM.md), [ADR-0088](docs/adr/ADR-0088-agentic-decision-cell.md) (superseded), [`simulations/SCHEMA.md`](simulations/SCHEMA.md) |
| **Red Room** | Красная комната: фаза выполнения инструментов клиентом (read-file, list-directory, file-exists и т.д.) после принятия решения в Gray Room |
| **Self-Upgrade** | Самоапгрейд: процесс самоулучшения системы через API-диалог (не прямое исполнение). Ключевое различие: агент не выполняет задачи самостоятельно, а направляет их через Client API (`/api/a2a/sessions`, `/next`, `/async`), управляя системой извне. Это создает контролируемый цикл: (1) агент анализирует кодовую базу, (2) формулирует задачи, (3) отправляет через API, (4) получает ответы, (5) корректирует. В dev-режиме проект целится сам на себя (a2a-client → a2a-script-agent), но архитектура позволяет работать с любым проектом. Граница: API-вызовы разделяют "анализирующий" и "исполняющий" контексты. **Порядок (политика):** сначала основные спеки/задачи в `tasks/` и при необходимости `tasks/ide-prompts/`; **перед большим объёмом сессионной работы** — **Session archival**; очередь сессионных промптов `prompts-to-agent-mode/` и Task Monitor — **после**, когда стек и контракты готовы к прогону (см. `tasks/README.md` → *Self-Upgrade order*; автоматической блокировки в коде нет) |
| **Router** | Keyword-based routing (dialog/agent/task-decomposition) |
| **Sync golden (`simulations/sync/`)** | Offline fixture layout: invoke-shaped step bundles per [`simulations/SCHEMA.md`](simulations/SCHEMA.md). **Not** HTTP “sync invoke”: A2A **`POST /api/v1/invoke` is async-only** (`promiseId` + poll) — see **Purple alert**. |
| **Task Monitor** | `monitor-and-process-tasks.js` — автоматизированный скрипт обработки очереди задач. Должен отправлять запросы в сессии через Client API (`POST /api/a2a/sessions/{id}/next` + `GET /api/a2a/sessions/{id}/async`) для ведения многошагового диалога в режиме агента. Требует правильной обработки router-диалога (Beat A/B): определение `form.choices` и отправка либо `message`, либо `choice` в зависимости от ответа сервера. Задачи выполняются итеративно через цикл next+poll до завершения |
| **MONITOR-QUICK-START** | Root operator doc `MONITOR-QUICK-START.md`: run commands, `TASK_MONITOR_*` env, session-dialog contract (same as web UI), state/hooks, failures → `tests/direct-tests` via ErrorClassifier |
| **Web DTO** | Client-sanitized execute (form only, not raw tool calls) |
| **Session archival (Self-Upgrade)** | Before a **large** monitor run, full-spectrum index over `prompts-to-agent-mode/`, or long manual Client API campaign: **copy or zip** important trees under `a2a-client/storage/sessions/{sessionId}/` to an operator archive (e.g. `logs/archive/sessions-<date>/`). Preserves step JSON for forensics; avoids losing history if storage is pruned or sessions 404. **Not** the same as **Session Cleanup** (destructive). Policy only — see [`tasks/README.md`](tasks/README.md) (*Self-Upgrade order*, step 2). |
| **Session Cleanup** | Удаление всех файлов в `C:\workspace\org-carrier\a2a-script-agent\a2a-client\storage\sessions` и `C:\workspace\org-carrier\a2a-script-agent\ai-integration\proxy_logs\**\*` для полной очистки состояния системы |
| **ErrorClassifier** | Система классификации ошибок в `tests/monitor-tasks/errors.js`. Распознает 30+ типов ошибок (connection, http, schema, llm, session, router, task, gray-room, filesystem, network, parse, async). Для каждой ошибки: severity (critical/high/medium/low), hint, quick fix, direct test command, diagnostic steps, environment diagnostic. Поддерживает генерацию PowerShell скриптов для диагностики |
| **Direct Tests** | Набор скриптов в `tests/direct-tests/` для диагностики проблем без запуска полного стека: `run-checks.ps1`, `test-dialog-flow.ps1`, `dialog/run-dialog-direct-local-hub.ps1`. Task Monitor автоматически предлагает релевантные direct tests при ошибках |
| **Schema validation** | Проверка форм контрактов (execute/result, сессии, симуляции). **Первый слой:** скрипты в [`tests/direct-tests/validators/`](tests/direct-tests/validators/README.md) — из корня репозитория `npm run scan-promise-bodies`, `scan-session-responses`, `verify:gray-room`, `audit:sim-choice-descriptions` и др. **Дальше:** золотые симуляции `npm run sim:lint` / `sim:validate`, зеркала MD/JSON `sim:check-md`, общие гварды (`tests/direct-tests/lib/a2a-schema-guards.mjs` и связанные тесты). См. [`AGENTS.md`](AGENTS.md) → Offline validators |
| **Yellow alert (scan)** | Команда для ИИ: скан кода на недочёты/костыли/недорешения — [`docs/YELLOW-ALERT-SCAN.md`](docs/YELLOW-ALERT-SCAN.md); в глоссарии: [Yellow alert (scan)](#yellow-alert-scan--жёлтая-тревога-скан) vs [operator](#yellow-alert-operator--жёлтая-тревога-оператор) |
| **Task Monitor Modules** | Модульная архитектура: `task-monitor-core.js` (конфигурация, состояние, логирование), `task-monitor-api.js` (Client API вызовы), `task-monitor-processing.js` (обработка задач), `task-monitor-daemon.js` (daemon режим), `task-monitor-utils.js` (утилиты), `task-monitor-validation.js` (валидация), `errors.js` (классификация ошибок) |

## Alerts (тревоги)

Operational **alert levels**: scope tags for triage (**which subsystem you touch** or **what kind of change** you are making). **Not** the same as **Rooms** (runtime pipeline phases — see [Rooms vs alerts](#rooms-vs-alerts) below).

### How alerts are used

**Two ways to set an alert (documentation / process — not a built-in runtime flag unless you add one):**

1. **Human-declared** — The operator states the alert (e.g. “**Gray alert**: we’re treating this as server-side until proven otherwise”). Use when you choose triage focus or change type.
2. **Assistant-declared** — The IDE/agent **proposes** an alert when it sees **patterns** (same failure class in two places, wrong router beat, duplicate sync path, etc.). The human **confirms or edits** the label; the assistant should not silently “clear” an alert without evidence.

**Duration:** Keep an alert **active** until the **situation is mitigated** — evidence that the **class** of issue is addressed (tests, second surface checked, or explicit rollback of the assumption). One fix in one file is often **not** enough: the same defect class often shows up elsewhere, so treat the alert as **sticky** until you verify or explicitly accept residual risk.

### Red alert — **Красная тревога**

**Переход в режим выполнения полного цикла работ** — выполнение `monitor-and-process-tasks.js` (`C:\workspace\org-carrier\a2a-script-agent\monitor-and-process-tasks.js`), то есть автоматизированный монитор очереди задач, управляющий сессиями через Client API и доводящий каждую задачу до завершения. **Чеклист соло‑цикла (до/вместе с монитором):** [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md#red-alert-solo-developer-workflow-checklist).

### Gray alert — **Серая тревога**

**Server only** — `a2a-server` (`/api/v1/invoke`, transforms, Gray Room chain, request processor). Assume the defect is on the server until proven otherwise. **Not** the same as **Gray Room** ([Core terms](#core-terms)).

### Black alert (proxy) — **Черная тревога (proxy)**

**Proxy only** — `ai-integration` (hub/proxy to Local LLM upstream, proxy logs, model routing). *Older notes sometimes used «красная» for proxy; black is the label for this layer.* Distinct from **Black alert (operator)** below.

### Blue alert — **Голубая тревога**

**Dialog/session contract** — multi-turn dialog is wrong (router Beat A/B, `message` vs `choice`, `execute.form`, step storage). Triage across Client API session flow and server dialog transforms; start from `GET …/sessions/{id}` and [`tests/direct-tests/README.md`](tests/direct-tests/README.md) / [`AGENTS.md`](AGENTS.md) router section.

### Purple alert — **Фиолетовая тревога**

**Async-first** — remove or narrow **sync** paths; prefer async (`promiseId`, poll `/result` or Client API `/async`) end-to-end. **Hard rule:** never **switch** the stack to synchronous invoke or **disable** the ai-integration promise queue (`PROMISE_DAEMON_ONLY`) as an operator shortcut — use the daemon or manual `POST /promise/<id>/execute` ([`AGENTS.md`](AGENTS.md) → *Async-only transport*).

### Orange alert — **Оранжевая тревога**

**Deduplication** — consolidate duplicate code, docs, or routes; one canonical path.

### Green alert — **Зелёная тревога**

**Small, targeted improvements** — local fixes, no large refactors or cross-cutting rewrites.

### Brown alert — **Коричневая тревога**

**Artifact bloat / undistilled notes** — redundant files or logs still hold value that has **not** been **squeezed** into the **shared pool** (canonical docs, `DEV_STATE`, `tasks/`, glossary — wherever the signal belongs). **Action:** (1) extract the **essence** of the context; (2) **add** it to the correct canonical place; (3) **move** the original artifact to **archive** (e.g. under `logs/archive/` or a dated archive tree), not leave it as the live source of truth. Clear the alert only after distill → place → archive.

### Teal alert — **Бирюзовая тревога**

**Contracts and versions** — breaking or drifting **API surface** (Client API ↔ server ↔ proxy), **semver** / compatibility promises, **schema** (JSON shape, execute/result). Triage: who must change, migration path, and **one** canonical contract. **Not** the same as **Blue alert** (dialog/router beats) — **Teal** is **static** contract/version alignment across components.

### Magenta alert — **Пурпурная тревога**

**Dependencies** — npm/pip/OS packages: **outdated**, **duplicate**, **vulnerable**, **licensing**, **lockfile drift**. **Not** **Orange alert** (dedupe your *own* code/docs) — **Magenta** is **third-party** graph and supply chain. **Not** **Purple alert** (фиолетовая) — async transport; **Magenta** is dependency hygiene.

### Amber alert — **Янтарная тревога**

**Documentation debt** — **canonical** README, ADRs, `ENV-MATRIX`, operator docs **do not match** behavior or code in production paths. **Not** **Brown alert** — Brown is **distill** from noisy artifacts into **the right** place; **Amber** is **fix** the already-canonical doc or the **code** so they agree. Clear the alert when the **lie** or **gap** is removed (update doc, or change code + doc together).

### Yellow alert (scan) — **Жёлтая тревога (скан)**

**AI / IDE command** — proactive pass over the codebase for **shortcomings, hacks, and unfinished fixes** (TODO/FIXME, fragile error handling, sync/async smells, contract drift, test gaps). **Normative procedure:** [`docs/YELLOW-ALERT-SCAN.md`](docs/YELLOW-ALERT-SCAN.md) (invocation text, pattern hints, report format). **Not** a subsystem scope tag (unlike **Black alert (proxy)** for `ai-integration`).

### Yellow alert (operator) — **Жёлтая тревога (оператор)**

**Escalation label** — You tell the agent (LLM or assistant) that something is **wrong** here, and it **insists** that the behavior is **correct as-is**.

**Activation:** Treat the alert as **on** after your correction has been **ignored twice** — two rounds where you point out the mistake and there is no substantive fix or acknowledgment. **Next step:** restate with concrete evidence (file, line, failing test, expected vs actual), narrow the claim, or change verification path (direct test, smaller repro). **Distinct from** [Yellow alert (scan)](#yellow-alert-scan--жёлтая-тревога-скан) — scan is **routine triage**; operator is **pushback escalation**.

### Rooms vs alerts

**Rooms** (**Black Room**, **Gray Room**, **Red Room**) are **runtime pipeline phases** — defined under [Core terms](#core-terms). **Colored alerts** here are **triage labels** (where to look first or what kind of change). Same color names (e.g. gray/red) refer to **different** concepts: e.g. **Gray alert** = server-side triage; **Gray Room** = server LLM chain before the client sees a response.
