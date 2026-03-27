# DEV_STATE - a2a-server (2026-03-27)

Текущее состояние подсистемы a2a-server.
> Методика: работаем по методике с дев файлами - пишем дев файл всегда, убираем ненужное всегда, двигаемся вперед всегда

---

## Scope Boundary

- Этот файл хранит только server-специфичные архитектуру, риски, задачи и историю изменений.
- Кросс-модульные решения/зависимости ведутся только в root: [`../DEV_STATE.md`](../DEV_STATE.md).
- Не дублировать здесь client/ai-integration backlog; хранить только ссылки на них при необходимости.

---

## Текущая архитектура

**Stateless server** - не хранит сессии, только обрабатывает запросы:
- Контекст передаётся в каждом запросе
- Session storage в Client API
- Keyword-based routing (без LLM для роутинга)

---

## Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/health` | Liveness |
| GET | `/api/v1/health` | API health |
| POST | `/api/v1/invoke` | Main invoke |
| GET | `/api/v1/requests/:promiseId/status` | Promise status |
| GET | `/api/v1/requests/:promiseId/result` | Promise result |
| POST | `/api/a2a/sessions/:sessionId/next` | Session bridge |

---

## Request Processors

| Component | Role |
|-----------|------|
| `request-processor.service` | Выбор процессора по action/task |
| `dialog-request-processor` | Dialog flow с LLM |
| `action-request-processor` | Tool/action flow |
| `form-request-processor` | Form/choice handling |
| `simulation-request-processor` | Simulation/golden flow |

---

## Protocol Contract

### Execute (action-key shape)

```json
{ "execute": { "read-file": { "path": "README.md" } } }
```

### Result (action-key shape)

```json
{ "result": { "read-file": { "path": "README.md", "content": "..." } } }
```

---

## Context Fields

- `context.execution` - текущее состояние выполнения
- `context.history` - история выполнения
- `context.workbench` - рабочее состояние (sections, batch, slots)
- `context.scratchpad` - временные данные

---

## Удалено/Deprecated

- Server-side session storage
- `neurons` subsystem
- LLM-based router transform
- Redis/BullMQ queue orchestration
- Prisma/PostgreSQL/pgvector persistence

---

## Simulations

**Canonical rules:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md)

### Что показывают goldens

- Router → `execute.form.choices` (keyword-based)
- Dialog + LLM tools
- Agent coder / smart flows
- Task decomposition
- Workspace tools (`list-directory`, `grep-search`, `read-file`, etc.)
- Gray room (`N-sub-M/` folders)

### Out of scope

- `promiseId`, async polling, retries
- `execute.wait` / loader timing

### Команды

```bash
# Lint
cd a2a-server && npm run sim:lint -- --all --json

# Validate
cd a2a-server && npm run sim:validate -- --all --json
```

---

## Проверка

```bash
# Liveness
curl -s http://localhost:3000/health

# Sync invoke
curl -s -X POST http://localhost:3000/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d "{\"task\":\"hello\",\"sync\":true}"
```

---

## Тесты

| Check | Command | Result |
|-------|---------|--------|
| Unit + integration | `cd a2a-server && npm run test` | 437 passed |
| Simulation lint | `cd a2a-server && npm run sim:lint -- --all --json` | valid |
| Simulation validate | `cd a2a-server && npm run sim:validate -- --all --json` | valid |
| ESLint | `cd a2a-server && npm run lint` | 0 errors |

---

## Ссылки

- [DEV_STATE.md](../DEV_STATE.md) - Root state файл (кросс-модульные зависимости)
- [AGENTS.md](../AGENTS.md) - Правила работы
- [docs/new-request-flow/PROTOCOL.md](../docs/new-request-flow/PROTOCOL.md) - Протокол
- [docs/GRAY-ROOM.md](docs/GRAY-ROOM.md) - Gray room спецификация
- [simulations/SERVER-CONTRACT.md](../simulations/SERVER-CONTRACT.md) - Contract overview

---

## State Governance (Inherited from Root)

- Этот файл является source of truth для server-состояния и обновляется после каждого значимого действия.
- Все задачи ведутся только со статусами и проверяемыми критериями.
- После выполнения: фиксировать фактическое состояние, удалять неактуальное, добавлять следующий исполнимый шаг.
- Блокеры фиксируются явно; при возможности устраняются в текущем цикле.
- Приоритет: завершение начатого -> стабилизация -> production readiness.

---

## Задачи (Next Tasks)

### Alternatives Migration Plan (server scope)
- [ ] **S-01 server-prompt-transforms**: lock transform loading mode (bundled defaults vs `PROMPTS_TRANSFORMS_PATH`) and add startup diagnostics.
- [ ] **S-02 server-action-registry-bootstrap**: decide fail-fast vs lenient startup when action markdown loading fails; encode as policy + tests.
- [ ] **S-03 server-requests-storage**: define default/override storage path behavior (`REQUESTS_STORAGE_PATH`) and retention/cleanup policy.
- [ ] **S-04 server-llm-hub-polling**: standardize `LLM_POLL_*`/`POLL_*` defaults and timeout budget for daemon processing.
- [ ] **S-05 server-filesystem-sandbox**: freeze cwd/tmp/home allowlist policy for file actions and expose clear error messages.
- [ ] **S-06 server-error-detail-level**: finalize production error redaction policy (`NODE_ENV`) and keep stack traces in dev only.
- [ ] **S-07 server-background-processor**: set and verify `REQUEST_PROCESSOR_INTERVAL_MS` target based on queue latency SLO.
- [ ] **S-08 server-logging**: unify `LOG_LEVEL`/`LOG_FORMAT` and Winston rotation/boot-clean strategy; add acceptance checks.
- [ ] **S-09 agent-rag-chain-limits**: set safe defaults for `A2A_AGENT_RAG_CHAIN_MAX` + project path envs and verify fallback behavior.

### Высокий приоритет (Phase 2-3)
- [x] Аудит всех процессоров на `Action-Key Shape`.
- [x] Проверка `request-processor.service.ts` - логика переключения на `agent` при наличии ключевых слов.
- [x] Загрузка всех симуляций и проверка `received.json`.
- [x] Полный прогон `npm run sim:validate`.

### Средний приоритет (Phase 4-5)
- [x] Логирование: добавить `sessionId` во все логи процессоров.
- [ ] Очистка `storage/requests` (удалить старые файлы).

### Simulation Contract & Docs (Complex)
- [ ] Выравнять серверный контракт transforms: для no-LLM шагов определить строгое правило по `server-transforms-request.json` и привести к нему `sim:validate`/`sim-lint` сообщения.
- [ ] Добавить в процессоры явную диагностику contract warnings (не только `valid`): чтобы в CI видно было “warning debt” по конкретному simulation step.
- [ ] Уточнить server policy для сокращённых golden-наборов: в каких action/step допускается отсутствие transform-файлов и где это фиксируется в документации.
- [ ] Добавить server-centric симуляции устойчивости: paginated `rag-search` drain, очередь `read-file` с накоплением в `context.files`, human-gate переходы между `execution.step`.
- [ ] Сверить реализацию и протокол по `scan-directory`: в docs есть открытые TODO (glob/grouping/cache), нужно либо реализовать, либо явно ограничить контракт и схемы.
- [ ] Разделить в `sim-validate` два режима отчётности: structural validity и contract completeness (чтобы optional-missing не терялся в общем `valid`).

### Large File Decomposition (400-500+ lines)
- [ ] **LF-S-01**: Decompose `src/transform/operations.ts` (~897) into grouped operation modules + shared JsonPath/value helpers.
- [ ] **LF-S-02**: Decompose `src/services/core/request-processor/dialog-request-processor.ts` (~781) into request normalization, LLM step orchestration, and finalize response path.
- [ ] **LF-S-03**: Decompose `scripts/sim-validate.ts` (~810) into scanner, validators, and report formatters.
- [ ] **LF-S-04**: Decompose `scripts/sim-lint.ts` (~718) into lint rule registry + rule runners + reporters.
- [ ] **LF-S-05**: Decompose `src/transform/pipeline.ts` (~481) into pipeline stages, error mapping, and pipeline context utilities.
- [ ] **LF-S-06**: Decompose `src/actions/handlers/file-operations.ts` (~432) into read/list/write operation handlers with strict security wrappers.

### Redundant Functionality Detection & Cleanup
- [ ] **RF-S-01 inventory**: Inventory overlapping server paths (transforms, action handlers, request processors) with duplicate responsibilities.
- [ ] **RF-S-02 rule-of-one-owner**: For each responsibility, keep exactly one owner module and mark others as deprecation targets.
- [ ] **RF-S-03 remove-dead-branches**: Remove unreachable/deprecated code paths after test + simulation confirmation.
- [ ] **RF-S-04 cleanup-gate**: Cleanup accepted only when `sim:lint`, `sim:validate`, and unit tests remain green.

### Unusual Findings Alignment (Server/Contracts)
- [ ] **UA-S-01 interrupt-trace-contract**: Verify and document one canonical contract for interrupt trace placement (`context.workbench.slots.interruptTrace`) across server transforms and client projection.
- [ ] **UA-S-02 no-llm-vs-llm-step-rules**: Tighten and centralize rules for required transform files on no-LLM vs LLM steps to reduce interpretation drift in simulations.

---

*Обновлено: 2026-03-27*

### Session Notes (2026-03-27)
- [x] Removed root-level `request.md` side-effect for dialog flow by routing render output to temp transform directory.
- [x] Added transform runtime support for separate template `baseDir` and artifact `outputDir` to avoid workspace pollution.