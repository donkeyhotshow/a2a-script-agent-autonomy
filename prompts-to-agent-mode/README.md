# Agent-mode prompts (Task Monitor queue)

> **Accompany the session.** Text in these files is **not** a one-shot HTTP body. On the live stack, one task = **one Client API `sessionId`** that you keep advancing until the dialog finishes: **`POST …/next`**, poll **`GET …/async`**, and when **`form.choices`** appear, the next **`/next`** must send the choice **`id`**. If you are not doing that loop yourself, run **`npm run monitor`** / **`monitor:once`** so the Task Monitor owns it. Creating a session and stopping is a common failure mode.

**Scope:** Only `.md` files **in this directory** (no subfolders) are read by **`monitor-and-process-tasks.js`** by default. Each one should be a task the **live stack can drive** (Client API: `POST /api/a2a/sessions` with `mode: "agent"`, then `/next` + `/async`). **Docs, methodology, ADR, sim-authoring, and module-plan prompts** live under **[`../tasks/ide-prompts/`](../tasks/ide-prompts/README.md)** — use them in the IDE **before** or **without** session automation.

**When to run this queue (policy):** Treat **`tasks/*.md`**, **`tasks/pending/`**, and **[`tasks/ide-prompts/`](../tasks/ide-prompts/README.md)** as **primary** engineering work in the IDE. **Execution on the live stack for this folder is only normative through the Task Monitor** — **`npm run monitor`** / **`monitor:once`** — so every prompt gets `/next` + `/async`, router handling, and a **`merged`** **`sessionId`** audit trail. Start the monitor **after** IDE queue is under control (or explicitly deprioritized); the binary does not enforce order — see **[`tasks/README.md`](../tasks/README.md)** (*Self-Upgrade order*). **Before a large monitor pass or full index:** archive valuable **`a2a-client/storage/sessions/*`** trees (same doc, step 2; [`GLOSSARY.md`](../GLOSSARY.md) *Session archival*).

**If you run the live stack:** read **[STACK-RUN.md](STACK-RUN.md)** first.

**Task Monitor:** **[`../MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md)** — `npm run monitor` / `npm run monitor:once`, `TASK_MONITOR_*`, router beats. Code: [`../monitor-and-process-tasks.js`](../monitor-and-process-tasks.js), [`../tests/monitor-tasks/`](../tests/monitor-tasks/). Static regression: **`npm run test:monitor`** (also runs at end of **`npm run test:before-start`**).

**Linear pipeline:** **[ONE-PIPELINE.md](ONE-PIPELINE.md)**. **Master prompt (daemon + hooks):** **[`../START-FULL-SPECTRUM.md`](../START-FULL-SPECTRUM.md)**.

This folder's name means prompts aligned with **agent mode** in session **context**; it does **not** mean paste into `invoke` on port 3000 alone.

## Run through the script-agent stack (Client API)

**Default for this queue:** drive **only** through the **Task Monitor** — [`npm run monitor`](../MONITOR-QUICK-START.md) / `monitor:once` — so finished prompts get a durable **`sessionId`** mapping. **Authoritative export:** [`npm run monitor:completed:json`](../MONITOR-QUICK-START.md) → JSON field **`merged`**. Ad-hoc curl / web UI uses the same Client API **shape** but does **not** auto-register in monitor state unless you run those turns via the monitor.

| Wrong default | Correct |
|---------------|---------|
| Only `POST :3000/api/v1/invoke` | `POST :5173/api/a2a/sessions` with **`mode: "agent"`**, then `/next` + poll `/async` |
| Treat "Agent prompt" as server payload | Treat it as **task text**; HTTP contour is **sessions** on the **client** origin |

1. Start the stack ([`start-all.bat`](../start-all.bat) / [`docs/SYSTEM_STARTUP.md`](../docs/SYSTEM_STARTUP.md)).
2. **`POST /api/a2a/sessions`** with **`mode: "agent"`** and the file's **Agent prompt** in **`task`** (or first `/next` text when there are no `form.choices`).
3. **`POST …/next`**, poll **`GET …/async`**, and **`GET …/sessions/{id}`** when the router shows **`choices`** — send **`result.choice`** / shorthand **`task`** as the choice **`id`**.

Normative detail: [`AGENTS.md`](../AGENTS.md) (*Unified manual path*). Curl: [`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md).

---

One file per task. Each file lists **sources** and a **copy-paste prompt**. Check **Completion** when done.

## Root state (`DEV_STATE.md`)

| Prompt file | Source |
|-------------|--------|
| [dev-state-router-drift-optional.md](dev-state-router-drift-optional.md) | [`DEV_STATE.md`](../DEV_STATE.md) (S10 optional) |
| [dev-state-client-test-failures.md](dev-state-client-test-failures.md) | [`DEV_STATE.md`](../DEV_STATE.md), [`a2a-client/DEV_STATE.md`](../a2a-client/DEV_STATE.md) |
| [dev-state-orchestrator-metrics.md](dev-state-orchestrator-metrics.md) | [`DEV_STATE.md`](../DEV_STATE.md) |
| [dev-state-align-with-work-state.md](dev-state-align-with-work-state.md) | [`DEV_STATE.md`](../DEV_STATE.md) vs [`work/STATE.md`](../work/STATE.md) |

## Work focus (`work/STATE.md`)

| Prompt file | Source |
|-------------|--------|
| [work-state-01-concept-end-to-end.md](work-state-01-concept-end-to-end.md) | [`work/STATE.md`](../work/STATE.md) §1 |
| [work-state-02-unified-data-language.md](work-state-02-unified-data-language.md) | [`work/STATE.md`](../work/STATE.md) §2 |
| [work-state-03-agent-modes-gray-room.md](work-state-03-agent-modes-gray-room.md) | [`work/STATE.md`](../work/STATE.md) §3 |
| [work-state-04-gray-room-concept.md](work-state-04-gray-room-concept.md) | [`work/STATE.md`](../work/STATE.md) §4 |
| [work-state-stale-links-and-s13.md](work-state-stale-links-and-s13.md) | Queue links vs `tasks/*.md` — inventory [`../tasks/ide-prompts/repo-task-specs-missing-restore.md`](../tasks/ide-prompts/repo-task-specs-missing-restore.md) |

## DEV_STATE backlog (priority summary)

| Prompt file | Source |
|-------------|--------|
| [work-task-a2a-dev-state-improvements.md](work-task-a2a-dev-state-improvements.md) | [`DEV_STATE.md`](../DEV_STATE.md) + [`work/STATE.md`](../work/STATE.md) |

## Work task specs (mirrors `tasks/*.md`)

| Prompt file | Source |
|-------------|--------|
| [work-task-s14-script-dialog-agent-response-parity.md](work-task-s14-script-dialog-agent-response-parity.md) | [`tasks/script-dialog-agent-response-parity.md`](../tasks/script-dialog-agent-response-parity.md) |
| [work-task-sync-documentation-router-drift.md](work-task-sync-documentation-router-drift.md) | [`tasks/sync-documentation-and-router-drift.md`](../tasks/sync-documentation-and-router-drift.md) |
| [work-task-sync-substeps-not-discovered.md](work-task-sync-substeps-not-discovered.md) | [`tasks/sync-substeps-not-discovered.md`](../tasks/sync-substeps-not-discovered.md) |
| [work-task-sync-llm-snapshot-coverage.md](work-task-sync-llm-snapshot-coverage.md) | [`tasks/sync-llm-snapshot-coverage.md`](../tasks/sync-llm-snapshot-coverage.md) |
| [work-task-sync-workspace-tools-golden-map.md](work-task-sync-workspace-tools-golden-map.md) | [`tasks/sync-workspace-tools-golden-map.md`](../tasks/sync-workspace-tools-golden-map.md) |
| [work-task-sync-form-choices-description.md](work-task-sync-form-choices-description.md) | [`tasks/sync-form-choices-description.md`](../tasks/sync-form-choices-description.md) |
| [work-task-sync-readme-and-cli-gap.md](work-task-sync-readme-and-cli-gap.md) | [`tasks/sync-readme-and-cli-gap.md`](../tasks/sync-readme-and-cli-gap.md) |
| [work-task-sync-step-contract-warnings.md](work-task-sync-step-contract-warnings.md) | [`tasks/sync-step-contract-warnings.md`](../tasks/sync-step-contract-warnings.md) |
| [work-task-analyze-test-failures.md](work-task-analyze-test-failures.md) | [`tasks/analyze-test-failures.md`](../tasks/analyze-test-failures.md) |
| [work-task-orchestrator-metrics-tracking.md](work-task-orchestrator-metrics-tracking.md) | [`tasks/orchestrator-metrics-tracking.md`](../tasks/orchestrator-metrics-tracking.md) |
| [work-task-rag-package-tests.md](work-task-rag-package-tests.md) | [`tasks/rag-package-tests.md`](../tasks/rag-package-tests.md) |

## Optional link hygiene

| Prompt file | Notes |
|-------------|--------|
| [work-task-system-improvement-priorities-missing.md](work-task-system-improvement-priorities-missing.md) | [`tasks/system-improvement-priorities.md`](../tasks/system-improvement-priorities.md); stale `work/tasks/` links in [`work/STATE.md`](../work/STATE.md) (SYS) |

## Client API manual verification (`a2a-client/docs/api-testing-plan.md`)

| Prompt file | Source |
|-------------|--------|
| [client-api-01-sessions-create-load.md](client-api-01-sessions-create-load.md) | §1 + checklist |
| [client-api-02-next-ack-first.md](client-api-02-next-ack-first.md) | §2 + checklist |
| [client-api-03-async-resolves-pending.md](client-api-03-async-resolves-pending.md) | §3 + checklist |
| [client-api-04-session-rebuild-highest-step.md](client-api-04-session-rebuild-highest-step.md) | §4 + checklist |
| [client-api-05-red-room-artifacts.md](client-api-05-red-room-artifacts.md) | §5 + checklist |

## Task Monitor script

| Prompt file | Source |
|-------------|--------|
| [task-monitor-quick-start.md](task-monitor-quick-start.md) | [`../MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md); [`../monitor-and-process-tasks.js`](../monitor-and-process-tasks.js), [`../tests/monitor-tasks/`](../tests/monitor-tasks/), [`../tests/infrastructure/monitor-and-process-tasks.test.js`](../tests/infrastructure/monitor-and-process-tasks.test.js); **`npm run test:monitor`** |

## IDE-only prompts (docs / methodology / sims)

**[`../tasks/ide-prompts/README.md`](../tasks/ide-prompts/README.md)** — not scanned by the default Task Monitor task dir.
