# Work — личные задачи и фокус

Этот файл — **стейт задач**: сюда пишем твои задачи и статус.  
Остальные документы в `work/` — про **апгрейд симуляций** (отдельно от этого файла). **Self-Upgrade:** Процесс самоулучшения системы через скрипт монитора или ручной диалог с агентом. См. [GLOSSARY.md](../GLOSSARY.md).

**Распределение:** спецификации и бэклог до/вне сессии — [`tasks/`](../tasks/README.md) (`tasks/*.md`, `tasks/pending/`). Промпты под **живой стек** (Task Monitor) — только плоские файлы в [`prompts-to-agent-mode/README.md`](../prompts-to-agent-mode/README.md). Доки/методология/ADR — [`tasks/ide-prompts/README.md`](../tasks/ide-prompts/README.md).

**Порядок Self-Upgrade (политика, не код):** сначала основная инженерная работа по очереди и спекам в `tasks/` / `tasks/ide-prompts/`; **перед большим объёмом** сессионной работы (полный прогон монитора, длинный daemon, массовые сессии) — **архивировать** нужные папки из `a2a-client/storage/sessions/` (см. [`tasks/README.md`](../tasks/README.md) шаг 2, [`GLOSSARY.md`](../GLOSSARY.md) *Session archival*); **после** этого — прогон очереди `prompts-to-agent-mode/` через сессии Client API (`monitor`, `/next`, `/async`). Скрипт монитора не блокирует старт, но так задуман операторский контур. Подробнее: [`tasks/README.md`](../tasks/README.md) → *Self-Upgrade order*.

**Живой стек (как UI):** **контракт HTTP (не путать с `invoke` :3000)** — [`prompts-to-agent-mode/STACK-RUN.md`](../prompts-to-agent-mode/STACK-RUN.md) (`POST /api/a2a/sessions` + `mode: "agent"`, затем `next` / `async`; канон — `AGENTS.md`). **Линейный процесс:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](../prompts-to-agent-mode/ONE-PIPELINE.md). **Старт всего индекса (мастер-промпт):** [`START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md).

---

## Вступительная часть (фокус)

1. **Полный пересмотр концепции** — запутанность на пути к варианту с агентом; много упущено, вброшено и отсеяно. Нужно пересмотреть **от начала до конца** и переделать **сверху донизу**.

2. **Единый «язык» данных** — скриптовая часть функций системы должна **говорить на том же языке**, что и агентская часть, чтобы **можно было отображать данные** (один контракт / одна форма представления). **Трекинг в очереди:** S14.

3. **Режимы агента и серая комната** — при разных режимах агента в запрос попадают **разные данные**; неясно, **много или мало** функций. **Серая комната** пока непонятна — будет ли работать; нужно **хотя бы без шагов серой комнаты** всё нормально прописать; серую комнату можно **вынести отдельно**.

4. **Серая комната** — концепт **очень непродуман**, его нужно **дотачивать**.

---

## Очередь задач

*(дополняй ниже по мере работы)*

| # | Задача | Статус |
|---|--------|--------|
| S1 | Аудит `docs/new-request-flow/json-schemas/server-transform.schema.json`: укоротить `description`, вынести повторяющиеся фрагменты в `$defs`, сохранить жёсткость (`additionalProperties: false`); после изменений — прогнать тесты трансформов | **done** — один `definitions` + `oneOf` через `$ref`, выровнено с `types.ts`/`validate.ts` (в т.ч. `include-if`/`condition`, `for-each` вложенные шаги), ~264 строки |
| S2 | Проследить путь данных до LLM: `runPromptsTransform` → `prepareInvokePayloadForLlmPrompt`, `attachWorkbenchForLlmPrompt`, пайплайны `prompts/transforms/*-request.json` / `server-transforms-request.json`; цель — только релевантное `action`/`step` (см. `simulations/SCHEMA.md`, таблица transform ops) | **done** — см. § «Путь к LLM» ниже |
| S3 | Токены на входе: оперы `truncate-section`, лимиты истории, отбрасывание путей «для снижения токенов» — зафиксировать где уже есть и где дыры (`a2a-server/src/transform/types.ts` и операции в `operations.ts`) | **done** — см. § «Токены» ниже |
| S4 | Дубли JSON-скелетов в `*-request.md`: вариант единого минимального каркаса + дельты по action — оценить и описать trade-off (меньше повторов в промпте vs ясность для модели) | **done** — см. § «Скелеты» ниже |
| S5 | Сверить «Token discipline» / `workbench_ops` в промптах с тем, что делает gray-room / оркестратор — нет ли повторного раздувания workbench | **done** — см. § «Gray room» ниже |
| S6 | Регрессия после любых правок схемы/промпта: `cd a2a-server && npm run test`, `npm run sim:lint -- --all`, `npm run sim:validate -- --all` (из корня репо, как в AGENTS.md) | **done** — `npm run test` (a2a-server), `sim:lint -- --all`, `sim-validate --all --strict` |
| S7 | Аудит `simulations/sync`: README vs SCHEMA + фиктивный `--path` в примерах | **done** — README переписан; `--sim` / `--all` (см. [`simulations/sync/README.md`](../simulations/sync/README.md)) |
| S8 | Step-contract: 47 предупреждений только в `simulations/sync` (`--step-contract`) | **done** — passthrough `server-transforms-request.json` + удалены лишние `server-transforms-response.json` (см. [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) / step-contract) |
| S9 | Sub-папки `N-sub-M` в `sim-validate --all` (по умолчанию); `--skip-substeps` для исключения; sim-lint обходит JSON в родительской симуляции | **done** — [`tasks/sync-substeps-not-discovered.md`](../tasks/sync-substeps-not-discovered.md) |
| S10 | `agent/` без `description.md`; дрейф роутера vs `shared/router-static-choices.json` | **partial** — добавлен `simulations/sync/agent/description.md`; чеклист — [`tasks/sync-documentation-and-router-drift.md`](../tasks/sync-documentation-and-router-drift.md) |
| S11 | `request.md`/`response.md` в sync — покрытие промпт-пайплайна | **done (sync tree)** — все шаги `simulations/sync/**` с `request.json`; [`scripts/gen-sim-md-mirrors.mjs`](../scripts/gen-sim-md-mirrors.mjs); `sim:check-md --fail`; см. [`tasks/sync-llm-snapshot-coverage.md`](../tasks/sync-llm-snapshot-coverage.md) |
| S12 | Карта всех `VALID_EXECUTE_KEYS` vs золотые шаги | **partial** — таблица в [`simulations/sync/agent-workspace-tools/description.md`](../simulations/sync/agent-workspace-tools/description.md) — [`tasks/sync-workspace-tools-golden-map.md`](../tasks/sync-workspace-tools-golden-map.md) |
| S13 | `execute.form.choices` без `description` (несколько шагов sync) | **done** — правки в `received.json` / `response.json` под [`simulations/sync/`](../simulations/sync/) |
| S14 | Паритет скриптового режима с dialog/agent: те же формы ответа, история/витрина, Web DTO / action-key shape — один контракт для UI и симов (см. фокус §2) | **partial** — матрица + `history`/`workbench.sections` в шагах 4–10, E2E smoke [`scripts/e2e-client-api-replay-sync-script.mjs`](../scripts/e2e-client-api-replay-sync-script.mjs); [`tasks/script-dialog-agent-response-parity.md`](../tasks/script-dialog-agent-response-parity.md) |
| SYS | Улучшение всей системы: приоритеты и связка модулей | **backlog** — [`tasks/system-improvement-priorities.md`](../tasks/system-improvement-priorities.md); очередь/sequence/`POST /api/v1/sequence` — [`tasks/pending/gray-room-system-tasks.md`](../tasks/pending/gray-room-system-tasks.md) |
| S15 | ai-integration: Z.AI стал default-провайдером, `/api/tags` теперь дополняет локальную Ollama только когда она доступна, `health/ready` смотрит на default-провайдер, README и конфиги обновлены | **done** — proxy_handler.py, config.py, providers/config_loader.py, health_routes.py, README |
| S16 | Self-Upgrade monitor run (2026-04-03): session `sess_1775163935824` **404** after storage prune — expected; router auto-submit + 409 delete guard mitigated. | **done** — [`tasks/pending/monitor-router-interaction-followup.md`](../tasks/pending/monitor-router-interaction-followup.md) closed |
| S17 | **Multi-Provider Model Selection:** Normalize ai-integration `/api/tags` to combine Z.AI + Ollama models; add model selection across stack (a2a-server → ai-integration). | **done** (core + UI baseline) — Web UI: Settings → default model (`/api/a2a/models` + `llmModel` on session create); `GET /sessions/:id` uses one handler (includeContext guard + flat message hydration) so tooling/monitor sees `context.execution.form` — [`ai-integration/DEV_STATE.md`](../ai-integration/DEV_STATE.md) |
| S18 | **`@a2a-client` web + vite-plugin:** Make `a2a-client/web` a proper scoped workspace package; `packages/vite-plugin` (`@a2a-client/vite-plugin`) — moved from legacy `vite-plugin-a2a`; workspaces, build, tests, publish checklist. | **pending** — [`tasks/pending/a2a-client-web-scoped-package.md`](../tasks/pending/a2a-client-web-scoped-package.md) |
| S19 | **Technical debt (legacy / sims / Gray Room):** legacy execute blobs & compat exports; missing goldens for promise/async/retries and `execute.wait`/loader; Gray Room triggers + interrupt budget + substep/transform contracts. | **partial** — trigger matrix + legacy `validateResultShape` tests + async README scope; see [`tasks/pending/technical-debt-legacy-sim-gray-room.md`](../tasks/pending/technical-debt-legacy-sim-gray-room.md) |

| S20 | projectId и sessionId не отправляются с сервера на клиента, и также не приходят с сервера | **pending** |

---

## Заметки

### Оптимизация схемы при сохранении работоспособности и низком расходе токенов

- **Документ vs рантайм:** урезание `server-transform.schema.json` влияет на валидацию/документацию и объём контекста в IDE; на токены LLM почти не влияет, если не тащить схему в промпт.
- **Реальные токены LLM:** размер `request.md` / блока Current State, история, workbench, RAG — смотреть фактический вывод пайплайна, не только JSON Schema файл.
- **Якоря в репо:** `a2a-server/src/transform/pipeline/prompts.ts`, `a2a-server/prompts/transforms/`, `docs/new-request-flow/REQUEST-SCHEMA.md`, `request.md` / `a2a-server/prompts/agent-request.md` (раздел Token discipline).

### Путь к LLM (S2)

`runPromptsTransform` (`pipeline/prompts.ts`) читает JSON-пайплайн → для `request` клонирует payload, `prepareInvokePayloadForLlmPrompt`, `attachFlowControlHintToInvokePayload`, `attachWorkbenchForLlmPrompt`, затем `runTransformPipeline`. Итоговый `request.md` — шаг `render-markdown` с `templateRef` на `*-request.md`. Симы: `server-transforms-request.json` в шаге; смысл «только релевантное» — набор ops в этом файле (`pick-context`, `truncate-history`, `truncate-section`, и т.д.).

### Токены на входе (S3)

- **Явно в типах/описаниях:** `PickFilesOperation` — «dropped to reduce LLM token usage» (`types.ts`).
- **Операции:** `truncate-section`, `truncate-history`, `pick-context`, `pick-files`, `drop`, `summarize-files` — в `operations.ts` / `transform-groups.ts`.
- **Лимит `request.md`:** опционально `LLM_REQUEST_MAX_CHARS` (целое ≥1) или поле `maxChars` на шаге `render-markdown` в JSON-пайплайне; суффикс — `truncateSuffix` или стандартное уведомление.

### Скелеты промптов (S4)

Сейчас: отдельный `Response Format` JSON-блок в каждом `*-request.md` — дублирование токенов в промпте, зато модель видит полный контракт action. Единый каркас + дельта снизит размер, но усложнит сопровождение и может ухудшить соблюдение формата; разумный компромисс — общий фрагмент в одном include/шаблоне (если появится препроцессор), не обязательно один физический файл на все actions.

### Gray room vs workbench_ops (S5)

Промпты поощряют дельты (`workbench_ops`). Оркестратор пишет служебные слоты (`grayRoom`, `interruptTrace` и др.) — это метаданные цикла, не замена секций. Риск раздувания: повторная отдача полного `context.workbench` в state-блоке при толстых секциях; компенсация — пайплайн (`truncate-section`, `pick-context`) и дисциплина дельт на стороне LLM.

### Script vs dialog/agent — ответы и отображение (фокус §2, S14)

**Проблема:** в фокусе §2 зафиксирована цель «один язык данных» между скриптовой веткой и agent/dialog; в очереди до S14 не было отдельной строки — риск потерять работу в S2/S5 (они закрывают **путь к LLM и workbench**, но не полный **UX/контракт ответа** для `execute.script` vs `execute.form` / сообщения).

**Уже сделано (смежно):** S2 — пайплайн и релевантный контекст; S5 — gray room vs раздувание workbench; AGENTS.md — action-key shape и Web DTO.

**Матрица script vs dialog/agent** (execute, result, history, workbench, Web DTO, сессии): [`tasks/script-dialog-agent-response-parity.md`](../tasks/script-dialog-agent-response-parity.md). Золотой контур Web DTO для `execute.script`: [`simulations/sync/script/`](../simulations/sync/script/).
