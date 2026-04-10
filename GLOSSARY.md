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
| **System errors (индекс)** | Папка [`docs/system-errors/`](docs/system-errors/README.md) — сводка кодов и классов ошибок: Task Monitor classifier, server transform validator, offline LLM shape, команды валидаторов. |
| **Battle recon (тестовая разведка)** | Режим `npm run test:recon` / `test:recon:mama` / флаг `--recon` у [`tests/papa-mama-gang.mjs`](tests/papa-mama-gang.mjs): жёсткие сканы артефактов (`--strict`), симуляции с `--step-contract`, у Papa — `REQUIRE_ASYNC_PIPELINE=1` для E2E. Нужен живой стек для полного прогона (`test:recon`). |
| **«Папа и мама поехали на дачу»** (*Parents went to the dacha*) | Метафора **информационной асимметрии**: со стороны звучит «лёгкий офлайн / отдых», но фактически идёт **последовательная** тяжёлая работа (стейт-доки, расширение охвата, интеграция на проводе). «Дети дома» — автоматизация и Mama-слой без полной видимости Papa; наблюдатель может **не знать**, какая смена реально отработала и на какой фазе план в `DEV_STATE` / `tasks/`. Подробно: [`PAPA-MAMA.md`](PAPA-MAMA.md) → *Metaphor*. |
| **Self-Upgrade** | Самоапгрейд: процесс самоулучшения системы через API-диалог (не прямое исполнение). Ключевое различие: агент не выполняет задачи самостоятельно, а направляет их через Client API (`/api/a2a/sessions`, `/next`, `/async`), управляя системой извне. Это создает контролируемый цикл: (1) агент анализирует кодовую базу, (2) формулирует задачи, (3) отправляет через API, (4) получает ответы, (5) корректирует. В dev-режиме проект целится сам на себя (a2a-client → a2a-script-agent), но архитектура позволяет работать с любым проектом. Граница: API-вызовы разделяют "анализирующий" и "исполняющий" контексты. **Порядок (политика):** сначала основные спеки/задачи в `tasks/` и при необходимости `tasks/ide-prompts/`; **перед большим объёмом сессионной работы** — **Session archival**; очередь сессионных промптов `prompts-to-agent-mode/` и Task Monitor — **после**, когда стек и контракты готовы к прогону (см. `tasks/README.md` → *Self-Upgrade order*; автоматической блокировки в коде нет) |
| **Router** | Keyword-based routing (dialog/agent/task-decomposition) |
| **Sync golden (`simulations/sync/`)** | Offline fixture layout: invoke-shaped step bundles per [`simulations/SCHEMA.md`](simulations/SCHEMA.md). **Not** HTTP “sync invoke”: A2A **`POST /api/v1/invoke` is async-only** (`promiseId` + poll) — see **Orange alert**. |
| **Task Monitor** | `tests/monitor-and-process-tasks.js` — **default executor** for the live-stack workflow on `prompts-to-agent-mode/`: full Client API loop (`POST …/next` + `GET …/async`), router Beat A/B, one session per prompt until done. **Common misread:** the `.md` file looks like one instruction; runtime is **many turns** on one **`sessionId`** — use the monitor or drive the loop manually. Batch runs **should** use this, not hand curl. **Hooks:** failures/timeouts → `hooks/task_monitor_issue.json`; success → `hooks/task_completion_report.json` (overwritten each success). **Audit:** `npm run monitor:completed:json` → **`merged`** — [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md) |
| **MONITOR-QUICK-START** | Root operator doc `MONITOR-QUICK-START.md`: run commands, `TASK_MONITOR_*` env, session-dialog contract (same as web UI), state/hooks, failures → `tests/direct-tests` via ErrorClassifier |
| **Web DTO** | Client-sanitized execute (form only, not raw tool calls) |
| **Session archival (Self-Upgrade)** | Before a **large** monitor run, full-spectrum index over `prompts-to-agent-mode/`, or long manual Client API campaign: **copy or zip** important trees under `a2a-client/storage/sessions/{sessionId}/` to an operator archive (e.g. `logs/archive/sessions-<date>/`). Preserves step JSON for forensics; avoids losing history if you run an explicit **Session Cleanup** or sessions 404. **Not** the same as **Session Cleanup** (destructive). Policy only — see [`tasks/README.md`](tasks/README.md) (*Self-Upgrade order*, step 2). |
| **Session Cleanup** | Explicit **full wipe** of client session trees (`a2a-client/storage/sessions/*`); broader “fresh” wipes also clear hub `proxy_logs`, server `storage/requests`, etc. (`cleanup:fresh` — see [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md)). **No** age-based pruning in shipped scripts. After cleanup, Task Monitor binds **one** Client API session per prompt (`taskSessions`) until completion. |
| **ErrorClassifier** | Система классификации ошибок в `tests/monitor-tasks/errors.js`. Распознает 30+ типов ошибок (connection, http, schema, llm, session, router, task, gray-room, filesystem, network, parse, async). Для каждой ошибки: severity (critical/high/medium/low), hint, quick fix, direct test command, diagnostic steps, environment diagnostic. Поддерживает генерацию PowerShell скриптов для диагностики |
| **Direct Tests** | Набор скриптов в `tests/direct-tests/` для диагностики проблем без запуска полного стека: `run-checks.ps1`, `test-dialog-flow.ps1`, `dialog/run-dialog-direct-local-hub.ps1`. Task Monitor автоматически предлагает релевантные direct tests при ошибках |
| **Schema validation** | Проверка форм контрактов (execute/result, сессии, симуляции). **Первый слой:** скрипты в [`tests/direct-tests/validators/`](tests/direct-tests/validators/README.md) — из корня репозитория `npm run scan-promise-bodies`, `scan-session-responses`, `verify:gray-room`, `audit:sim-choice-descriptions` и др. **Один `promiseId` (отчёт по сторам + Gray Room):** `npm run report:promise -- <id> [--out file.md]`. **Дальше:** золотые симуляции `npm run sim:lint` / `sim:validate`, зеркала MD/JSON `sim:check-md`, общие гварды (`tests/direct-tests/lib/a2a-schema-guards.mjs` и связанные тесты). См. [`AGENTS.md`](AGENTS.md) → Offline validators |
| **Yellow alert (scan)** | Команда для ИИ: скан кода на недочёты/костыли/недорешения — [`docs/YELLOW-ALERT-SCAN.md`](docs/YELLOW-ALERT-SCAN.md); в глоссарии: [Yellow alert (scan)](#yellow-alert-scan--жёлтая-тревога-скан) vs [operator](#yellow-alert-operator--жёлтая-тревога-оператор) |
| **Task Monitor Modules** | Модульная архитектура: `task-monitor-core.js` (конфигурация, состояние, логирование), `task-monitor-api.js` (Client API вызовы), `task-monitor-processing.js` (обработка задач), `task-monitor-daemon.js` (daemon режим), `task-monitor-utils.js` (утилиты), `task-monitor-validation.js` (валидация), `errors.js` (классификация ошибок) |

## Alerts (тревоги)

**Alerts** are **triage labels**: they answer *where to look first* or *what kind of work this is*. They are **not** runtime flags unless you add your own. **Do not confuse** them with **Rooms** (Gray / Red / Black **Room** = pipeline phases — see [Rooms vs alerts](#rooms-vs-alerts)).

### How alerts are used

1. **Human-declared** — You name the alert when you choose focus (e.g. “**Gray alert**: assume server until proven otherwise”).
2. **Assistant-declared** — The IDE/agent **suggests** a label when it sees a **pattern** (e.g. wrong router beat twice). You **confirm or change** it; do not drop an alert without **evidence** of mitigation.

**Until when:** Keep the label **until the risk class is actually addressed** — second surface checked, test added, or you **explicitly** accept leftover risk. A single-file fix often is **not** enough for the same failure **class**.

### Red alert — **Красная тревога**

**Переход в режим выполнения полного цикла работ** — выполнение `tests/monitor-and-process-tasks.js` (в корне репозитория), то есть автоматизированный монитор очереди задач, управляющий сессиями через Client API и доводящий каждую задачу до завершения. **Чеклист соло‑цикла (до/вместе с монитором):** [`MONITOR-QUICK-START.md`](MONITOR-QUICK-START.md#red-alert-solo-developer-workflow-checklist).

### Gray alert — **Серая тревога**

**Server only** — `a2a-server` (`/api/v1/invoke`, transforms, Gray Room chain, request processor). Assume the defect is on the server until proven otherwise. **Not** the same as **Gray Room** ([Core terms](#core-terms)).

### Black alert (proxy) — **Черная тревога (proxy)**

**Proxy only** — `ai-integration` (hub/proxy to Local LLM upstream, proxy logs, model routing). *Older notes sometimes used «красная» for proxy; black is the label for this layer.* Distinct from **Black alert (operator)** below.

### Blue alert — **Голубая тревога**

**Dialog/session contract** — multi-turn dialog is wrong (router Beat A/B, `message` vs `choice`, `execute.form`, step storage). Triage across Client API session flow and server dialog transforms; start from `GET …/sessions/{id}` and [`tests/direct-tests/README.md`](tests/direct-tests/README.md) / [`AGENTS.md`](AGENTS.md) router section.

### Purple alert — **Фиолетовая тревога**

**Консолидация дублей** — merge duplicate code, docs, or routes into **one** canonical path. **Temporary** in-repo harmful-pattern hunt (security grep pass — not the same as dedupe): [`docs/PURPLE-ALERT-HARMFUL-HUNT.md`](docs/PURPLE-ALERT-HARMFUL-HUNT.md).

### Orange alert — **Оранжевая тревога**

**Scope:** **Async transport** — the whole stack is **`promiseId` + poll**, not “return full `execute` on POST.”

**Permanent policy — оранжевая тревога навсегда:** This is **not** a temporary triage label you “clear” by switching to sync. Async-only end-to-end is the **only** supported operating mode ([`AGENTS.md`](AGENTS.md) → *Async-only transport*).

**Hard rules**

- Do **not** add a **sync** invoke path, **not** document “disable the queue” as a fix, **not** turn off **`PROMISE_DAEMON_ONLY`** to unstick work — drain with the **daemon** or **`POST /promise/<id>/execute`** ([`AGENTS.md`](AGENTS.md) → *Async-only transport*).

**What “good” looks like (Client API)**

1. `POST /api/a2a/sessions` → note **`sessionId`**.
2. After **every** `POST …/next`: poll **`GET …/async`** until **not** busy → **`GET …/sessions/{id}`** and read **`execute.form`** (**choices** → next body is **choice** `id`; else **message**).
3. Only then send the **next** `/next`. **Never** skip a router beat, **never** treat the `/next` ack alone as a finished turn, **never** send overlapping `/next` while async is still pending.

**Disk** (`a2a-client/storage/sessions/{sessionId}/…`) is **evidence** for debugging — not a substitute for fixing the driver loop. If steps break, fix **seed `mode`**, **body shape**, and **poll order**; do not hand-edit JSON to “look correct.”

**Goal:** each settled step exposes a form the **next** turn can answer, so **tools and agent actions stay runnable.**

### Green alert — **Зелёная тревога**

**Small, targeted improvements** — local fixes, no large refactors or cross-cutting rewrites.

### Brown alert — **Коричневая тревога**

**Artifact bloat / undistilled notes** — redundant files or logs still hold value that has **not** been **squeezed** into the **shared pool** (canonical docs, `DEV_STATE`, `tasks/`, glossary — wherever the signal belongs). **Action:** (1) extract the **essence** of the context; (2) **add** it to the correct canonical place; (3) **move** the original artifact to **archive** (e.g. under `logs/archive/` or a dated archive tree), not leave it as the live source of truth. Clear the alert only after distill → place → archive.

### Teal alert — **Бирюзовая тревога**

**Contracts and versions** — breaking or drifting **API surface** (Client API ↔ server ↔ proxy), **semver** / compatibility promises, **schema** (JSON shape, execute/result). Triage: who must change, migration path, and **one** canonical contract. **Not** the same as **Blue alert** (dialog/router beats) — **Teal** is **static** contract/version alignment across components.

### Magenta alert — **Пурпурная тревога**

**Dependencies** — npm/pip/OS packages: **outdated**, **duplicate**, **vulnerable**, **licensing**, **lockfile drift**. **Not** **Purple alert** (dedupe your *own* code/docs) — **Magenta** is **third-party** graph and supply chain. **Not** **Orange alert** — async transport; **Magenta** is dependency hygiene.

### Amber alert — **Янтарная тревога**

**Documentation debt** — **canonical** README, ADRs, `ENV-MATRIX`, operator docs **do not match** behavior or code in production paths. **Not** **Brown alert** — Brown is **distill** from noisy artifacts into **the right** place; **Amber** is **fix** the already-canonical doc or the **code** so they agree. Clear the alert when the **lie** or **gap** is removed (update doc, or change code + doc together).

### Yellow alert (scan) — **Жёлтая тревога (скан)**

**AI / IDE command** — proactive pass over the codebase for **shortcomings, hacks, and unfinished fixes** (TODO/FIXME, fragile error handling, sync/async smells, contract drift, test gaps). **Normative procedure:** [`docs/YELLOW-ALERT-SCAN.md`](docs/YELLOW-ALERT-SCAN.md) (invocation text, pattern hints, report format). **Not** a subsystem scope tag (unlike **Black alert (proxy)** for `ai-integration`).

### Yellow alert (operator) — **Жёлтая тревога (оператор)**

**Escalation label** — You tell the agent (LLM or assistant) that something is **wrong** here, and it **insists** that the behavior is **correct as-is**.

**Activation:** Treat the alert as **on** after your correction has been **ignored twice** — two rounds where you point out the mistake and there is no substantive fix or acknowledgment. **Next step:** restate with concrete evidence (file, line, failing test, expected vs actual), narrow the claim, or change verification path (direct test, smaller repro). **Distinct from** [Yellow alert (scan)](#yellow-alert-scan--жёлтая-тревога-скан) — scan is **routine triage**; operator is **pushback escalation**.

### Rooms vs alerts

**Rooms** (**Black Room**, **Gray Room**, **Red Room**) are **runtime pipeline phases** — defined under [Core terms](#core-terms). **Colored alerts** here are **triage labels** (where to look first or what kind of change). Same color names (e.g. gray/red) refer to **different** concepts: e.g. **Gray alert** = server-side triage; **Gray Room** = server LLM chain before the client sees a response.
