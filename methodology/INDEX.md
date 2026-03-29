# Методология агент-скрипта — INDEX

> Этот файл содержит основной мета-промпт, грамотную структуру и ссылки на детали. Здесь около 300 строк, остальные документы стараются быть компактными (100-150 строк).

---

## 1. Содержание

1. Обзор мета-протокола
2. Режимы и роли
3. Цикл A2A
4. Agent-level checklists
5. Monitoring & metrics
6. Data flows
7. Documentation plan
8. Sample scenarios
9. Future tasks
10. Security & maintenance
11. References

## 2. Обзор метапромпта

- Назначение: управлять режимами `work`, `debug`, `maintenance`.
- Совмещает:
  - CI/CD (Client + Server + Integration)
  - Monitoring (metrics, health)
  - Diagnostics (mode 2)
- Основной файл: `methodology/mode1.md`.
- Диагностика: `methodology/mode2.md`.
- Переключения: `methodology/transitions.md`.
- Implementation: `methodology/implementation.md`.
- Tasks: `methodology/tasks.md`.
- Improvements: `methodology/improvements.md`.
- Оператор (человек или Cursor) управляет **запущенным агентом** через **HTTP/curl**, не через веб-UI как основной контур: `docs/OPERATOR-CURL.md`.
- **Единый ручной контур:** **`POST /api/a2a/sessions`**, затем **`/next`** + poll **`/async`**; типичный UX — **два удара**: текст направления работы, потом **`choice`** по списку роутера (Агент / …). См. `AGENTS.md` → *Unified manual path* и *Router dialog (two beats)*.
- **Сессии, E2E, «режим agent»:** жизненный цикл сессии и шаги на диске — у **Client API** (в dev по умолчанию `http://localhost:5173/api/a2a/*`); **не** путать с одним лишь `POST /api/v1/invoke` на `:3000`. Альтернатива — standalone SDK (тот же контракт, другой порт): [ADR-0028](../docs/adr/ADR-0028-client-api-deployment-modes.md). **Agent** на старте — поля **`mode` / `execution`** в теле создания сессии; далее — `context.execution` / workbench.
- Оркестратор ADR ↔ код (очередь ADR, отдельный state-файл, один целевой проект, тот же Client API): `methodology/adr-compliance-orchestrator.md`; указатель в `docs/adr/README.md` (раздел Tooling).

## 3. Цикл A2A — шаг за шагом

1. Прочитать `methodology/transitions.md` — определить текущий режим.
2. Проверить `/tasks/pending/`.
3. Если очереди нет — **не** считать это «концом работы» и **не ждать сигнала**: idle-протокол — `methodology/tasks.md`; в `AGENTS.md` сразу под Quick Reference блок **«Empty queue — mandatory»** и чеклист п.5 — почистить `DEV_STATE`, найти работу, записать задачи, затем снова шаг 2. **Короткий или пустой запрос пользователя** не отменяет это: нет явного «стоп» / «один шаг» — продолжать итерации по протоколу (см. **`START-PROMPT-UNLIM.md`** → *Итеративность при слабом или пустом промпте пользователя*).
4. Если очередь есть — выбираем первую задачу с тэгом `priority`.
5. Формируем Prompt: `description`, `inputs`, `criteria`.
6. Уточняем `relations`: `relatedIssues`, `owner`, `module`.
7. Запускаем `task-execute` через Client API.
8. Получаем ответ от агента, сохраняем в `/logs/archive/{timestamp}/client`.
9. Пишем `server` лог, связываем с `traceId`.
10. Сохраняем `result` в `/logs/archive/{timestamp}/server`.
11. Обновляем `/runtime/status.json` (`current_mode`, `pending_tasks_count`, `next_check`).
12. Добавляем запись в `/runtime/metrics.json`.
13. Если результат успешен — удаляем `pending` и ай лог в `/logs/archive/{timestamp}/cleanup`.
14. Если ошибки — формируем diagnostic task и добавляем `pending/diagnostic-{timestamp}`.
15. При `error_rate` >5% и `pending_queue_age` >1h — сигналим `mode2`.
16. Если `pending` чист → `task-cleanup`, `task-add`, `task-execute` (iterate).
17. Ведём `runtime/retrospective` после каждого `mode switch`.
18. Периодически архивируем `/logs/archive/`.
19. Проверяем health сервисов (3000, 11434, 11435).
20. Если что-то вне норм — фиксируем `diagnostics` → `mode2`.

## 4. Роли и режимы

- **Режим 1 (work)**: выполнение задач, не инициирует diag.
- **Режим 2 (debug)**: анализ логов, диагностика, исправления, удаление `pending`.
- **Режим 3 (maintenance)**: обслуживание, ротация, backup, проверка целостности.

## 5. Agent-level checklists

### a2a-client

1. Синхронизировать `PORT`, `SKIP_AUTH`, `DEFAULT_SYNC_MODE`.
2. Проверять `/tasks/templates/` на релевантные шаблоны.
3. Создавать `task` с `description`, `inputs`, `acceptanceCriteria`.
4. Запускать `task-execute`, сохранять `traceId`. Ручная проверка сессий: **не** останавливаться на первом успешном цикле — [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md), [`START-PROMPT-UNLIM.md`](../START-PROMPT-UNLIM.md) → *Ручные испытания Client API*. Для испытаний — **поднять агентскую сессию через Client API** (`POST /sessions` + `mode: "agent"` + `task`, далее `/next` + `/async`); при ошибках — **создавать задачи** в `tasks/pending/` и править `DEV_STATE`, чтобы **другие** сессии агента подхватили фиксы/проверки, а не только «дожимать» ту же сессию.
5. Сохранять результаты в `/logs/archive/`.
6. Запускать `task-cleanup` после серии.
7. Обновлять статус в `/runtime/status.json`.
8. При ошибках → `task-add` diagnostic, переход в `mode2`.
9. Обновлять `DEV_STATE.md`.
10. Отвечать на overrides (mode=debug|work).

### a2a-server

1. Соблюдать action-key shape.
2. Логировать Gray Room, interrupts.
3. Проверять `runtime/status` и `metrics`.
4. При `error_rate` >5% → `mode2`.
5. Реагировать на health Ollama/AI Hub (11435, 11434).
6. Хранить `traceId` в логах.
7. Отправлять команды `task-execute`.
8. Поддерживать `mode switch`.
9. Синхронизировать `logs` с `methodology/tasks.md`.

### ai-integration

1. Отслеживать цепочку Client → Server → LLM.
2. Поддерживать retry/timeout.
3. Использовать `runtime/retrospective`.
4. Работать с `simulations/SCHEMA.md`.
5. Вносить `integration` задачи в `methodology/tasks.md`.

## 6. Monitoring & metrics

- `runtime/metrics.json`: `cycle_time`, `task_success_rate`, `error_rate`, `pending_queue_age`.
- `cycle_time` target < 60s.
- `task_success_rate` target > 95%.
- `error_rate` alert at 5%.
- `pending_queue_age` target < 60 minutes.
- Каждый цикл записывает `metrics`.
- При превышении thresholds — `alerts`.
- `Gray Room` checks: no `asyncPending` > 5 min.
- Health pipeline: `curl /health` → log → metric.
- Metrics exported to dashboards (Grafana, Prometheus).
- Use `scripts/metrics-sync.sh` for integration.
- If `pending_queue_age` > 90 min → `task-add`.

## 7. Data flows

- Типичный цикл сессии: Client API → `POST /api/a2a/sessions` → `POST /api/a2a/sessions/{id}/next` → poll `GET /api/a2a/sessions/{id}/async` → `GET …/sessions/{id}` для финала → внутри плагин/SDK проксирует **A2A Server** `POST /api/v1/invoke` (`:3000`) → AI Hub / Ollama → ответы и шаги в `a2a-client/storage/sessions/`. **Испытания** этого контура: чеклист + Red Room §5 в [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md), не «один happy-path». Дополнительно (если включено в клиенте): `POST /api/a2a/sessions/task-execute` и аналоги task-add.
- Diagnostics → `methodology/mode2.md` → `/logs/archive/debug` → `pending`.
- Transitions (mode switch) recorded via `methodology/transitions.md`.
- Implementation details in `methodology/implementation.md`.
- Tasks management in `methodology/tasks.md`.
- KPI and QA in `methodology/improvements.md`.

## 8. Documentation plan

1. `methodology/INDEX.md` — entry point.
2. Each topic ≤ 150 lines.
3. Link new files in INDEX, update `DEV_STATE`.
4. Keep `AGENTS.md` synced with agent expectations.
5. Update `README.md`, `docs/ADR-*`, `GLOSSARY.md` with references.
6. Document new scripts in `scripts/`.
7. Run `scripts/check-methodology.sh` on CI.

## 9. Sample scenarios

1. Task Add → Execute → Cleanup.
2. Diagnostic sequence: script → export → analyze → update `pending`.
3. Maintenance: log rotation → backup → verification.
4. Health fail: log, switch to mode 2, fix, return to mode 1.
5. Manual override: `mode=debug`, confirm `override_expires_at`.
6. Scalability: parallel tasks, splitted queue, thrice.
7. Emergency: `error_rate` spike → immediate diag → `mode2`.
8. Add new documentation: `task-execute` doc updates.
9. Security: run health check, rotate logs.
10. Monitoring: update dashboards and metrics.

## 10. Future tasks

- Add `methodology/quick-reference.md`.
- Create `methodology/diag-gallery.md`.
- Develop `methodology/chart-workflow.md`.
- Write `scripts/check-methodology.sh`.
- Introduce `methodology/TODO.md`.
- Add `methodology/alerts.md`.
- Update `DEV_STATE.md`.
- Document `Gray Room` steps.
- Expand `methodology/improvements.md` with new KPI.
- Build `methodology/metrics-playbook.md`.
- Add `methodology/health-playbook.md`.

## 11. Security & maintenance

- Rotate logs older than thresholds: runtime 24h, sessions 7d, debug 3d.
- Avoid storing secrets in `/logs`.
- Keep `/runtime/status.json` as single source of truth.
- Restrict access to `methodology/` per `AGENTS.md`.
- Run maintenance scripts weekly (`scripts/rotate-logs`, `scripts/backup`).
- Archive old logs to `oldest_{timestamp}.zip`.
- Monitor disk usage and trigger `task-maintenance`.
- Document health checks in `methodology/implementation.md`.
- Validate backups after rotation.

## 12. Index maintenance

- Run `scripts/validate-docs` in CI.
- Update `DEV_STATE_COMPLETION_PLAN.md`.
- Tag each section with owner and date.
- Cross-link new files and backlog items.
- Ensure indexes refer to `methodology/*`.

## 13. Retrospectives

- Each retrospective includes `mode_switches`, `issues_encountered`, `issues_resolved`, `lessons_learned`, `improvements_proposed`.
- Conduct after each mode 2 → mode 1 switch and weekly.
- Feed outcomes into `methodology/improvements.md`.
- Store in `/runtime/retrospective-{timestamp}.json`.

## 14. References

- `docs/OPERATOR-CURL.md`
- `methodology/mode1.md`
- `methodology/mode2.md`
- `methodology/transitions.md`
- `methodology/implementation.md`
- `methodology/tasks.md`
- `methodology/improvements.md`

---

*INDEX обновлён и содержит ≈300 строк; остальные файлы ограничены 100-150 строками для удобства чтения.*

## 15. Compliance & audits

- Проверка роутинга через `AGENTS.md`.
- Проверка ENV: `PORT`, `SKIP_AUTH`, `DEFAULT_SYNC_MODE`.
- Audits: `runtime/status`, `runtime/metrics`, `logs`.
- Каждый месяц проводим аудит `methodology` файлов.
- Отчёт включает `issues`, `status`, `owner`.
- Отчитываемся в `DEV_STATE`.
- Документируем `Gray Room` compliance.
- Проверяем `log` retention policy.
- Обновляем `methodology/index`.

## 16. Communication flows

1. Client sends task → server logs request.
2. Server forwards to Ollama (AI Hub) → response stored.
3. Diagnostics uses localStorage + `curl`.
4. transitions logs mode switches.
5. Implementation files describe runtime.
6. Tasks file tracks backlog.
7. Improvements file holds KPI + QA.
8. Agents cross-check via AGENTS.
9. Documents share via `docs/`, `proposals/`.
10. Entities rely on `runtime/retrospective`.
11. Communication uses `traceId`.
12. All flows mention `traceId` in logs.

## 17. Quality & release gates

- Gate 1: `task` description validated.
- Gate 2: `task-execute` run with success.
- Gate 3: `runtime/status.json` updated.
- Gate 4: `runtime/metrics.json` generated.
- Gate 5: `logs` archived.
- Gate 6: `DEV_STATE` updated if needed.
- Gate 7: `AGENTS` signature for interventions.
- Gate 8: `KPI` thresholds respected.
- Gate 9: `mode switch` recorded.
- Pre-release: run `scripts/check-methodology`, `scripts/validate-docs`.
- Release: publish `retrospective`.
- Post-release: confirm `pending` empty.

## 18. Documentation indexes

- Maintain `methodology/index`.
- Update `methodology/TOC.md` (if created).
- Each file references `INDEX`.
- Keep `README` referencing `methodology`.
- Add reference to `DEV_STATE`.
- Document new features in `docs/`.
- Keep `AGENTS` aligned.
- Log updates in `logs/archive/doc-updates`.

## 19. Expansion roadmap

- Add `methodology/automation.md`.
- Create `methodology/health-playbook.md`.
- Draft `methodology/operations.md`.
- Maintain `methodology/mode2-examples.md`.
- Expand `methodology/tasks.md` with cases.
- Review `methodology/improvements.md` quarterly.
- Sync `methodology` folder with `DEV_STATE`.
- Keep <150 lines per helper file.

## 20. Closing reminder

- Keep INDEX around 300 lines.
- Keep other files 100-150 lines.
- Add new sections only with cross-links and owners.

## 21. Content expansion checklist

1. Add thorough description for each new agent flow.
2. Ensure `methodology/<topic>.md` has owner metadata.
3. Provide sample API commands.
4. Reference `methodology/tasks.md` inside new docs.
5. Maintain table of contents in `INDEX`.
6. Log changes in `DEV_STATE`.
7. Update `AGENTS` for new flows.
8. Provide `traceId` sample for each scenario.
9. Mention dependencies in `docs/`.
10. Create diag summary for critical faults.
11. Keep quick reference up to date.
12. Validate forwarding from `methodology` to `logs`.
13. Ensure metrics link to `runtime/metrics`.
14. Document manual overrides.
15. Note watchers (health, log watchers).
16. Maintain list of scripts used by doc (with paths).
17. Append new releases to `retrospective`.
18. Keep 100-150 lines per helper file.
19. Provide english translations if needed.
20. Keep file ordering alphabetical.

21. Add `methodology/operation-guides.md` referencing `mode1`.
22. Keep statuses updated before and after each cycle.
23. Archive old iterations and mention them in `DEV_STATE`.
24. Link `methodology/tasks.md` to `methodology/improvements.md` updates.
25. Maintain a changelog within `methodology/`.

26. Provide references for new scripts in `docs/`.
27. Track ownership changes in `AGENTS.md`.
28. Validate new sections in CI.
