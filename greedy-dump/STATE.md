# Greedy dump — sequence state

**Last updated:** 2026-03-30  
**Branch:** `greedy-dump`

## Ordered phases (do not skip)

 1. **Inventory** — Confirm SOURCE tree; refresh `TASK-TREE.md` if folders change.
 2. **Stub pass** — Keep `mirror/` small; add `stubs/*.txt` manifests where a slice needs anchors.
 3. **priority-1 → priority-2** — Implement server actions for highest-value scripts first (fewer files).
 4. **priority-3** — Per subproject tasks (`SUBTREE.md`); one action registration batch per project after review.
 5. **priority-5 / priority-6** — Large archives and backups; extract scripts under `others/` before coding.
 6. **enggineered-prompts** — Last wave: prompts as data assets + optional router copy, not necessarily executable scripts.

## Current cursor

| Step | Status | Notes |
|------|--------|--------|
| Branch created | done | `greedy-dump` |
| Docs + task tree | done | `TASK-TREE.md`, per-folder `TASK.md` |
| Physical sample copy | skipped | Use SOURCE directly or add tiny stubs per task |
| First implementation ticket | done | laravel-agent-workspace-tools → 14 server actions |

## Log

- 2026-03-29 — Initial STATE, DOCUMENTS-STATE, mirror stubs (no large zip).
- 2026-03-29 — Phase 0: Project lens added (from README.md + AGENTS.md).
- 2026-03-29 — Phase 1: Verified priority-2 structure (a2a, agent.openrouter.ai, laravel-agent-workspace-tools). No actual scripts copied yet to mirror - stubs empty. ACTION: First implementation ticket still pending.
- 2026-03-29 — Phase 1: priority-2/CONTENT.md updated with verified structure. `laravel-agent-workspace-tools` confirmed as **Laravel: yes**.
- 2026-03-29 — Phase 1: Verified priority-1 (`bootstrap-platform`, `ml-integration`).
- 2026-03-29 — Phase 1: TASK-TREE.md checkboxes updated. priority-1 done, laravel-agent-workspace-tools marked **Laravel: yes**.
- 2026-03-29 — Phase 1: Created **Laravel sub-agent profile** note below.
- 2026-03-29 — **Session prompt completed:** Phase 0 project lens (from README.md + AGENTS.md), greedy-dump queue reviewed. Laravel sub-agent profile already documented. TASK-TREE.md verified - priority-1 done, priority-2/laravel-agent-workspace-tools marked done, agent.openrouter.ai checked (no scripts folder, API integration snippets only). Moving to next unchecked slice.
- 2026-03-29 — Processed admin-app: deferred (environment-specific sync utilities)
- 2026-03-31 — Idle queue protocol + script verification: 200+ scripts verified. Created 3 adaptation tasks:
  - adapter-laravel-workspace-tools.md (16 scripts, Laravel)
  - analyze-services-carrier-scripts.md (81 scripts)
  - analyze-ai-survey-platform-scripts.md (80+ scripts, Laravel)

---

## Project lens (from README.md + AGENTS.md)

**Этот репозиторий (a2a-script-agent) — это:**

- **Стек координации A2A** с Client API (Vite plugin, порт 5173), A2A Server (Node.js, порт 3000), AI Hub proxy (Python, порт 11434), Ollama (LLM inference, порт 11435)
- **Orchestrator-agnostic** — может управлять задачами для Laravel через session API с `mode: agent`
- **Session persistence** в `a2a-client/storage/sessions/` с step-based форматом
- **Server actions** — TypeScript actions регистрируются в `a2a-server/src/actions/definitions/` для script/read/transform операций

**Это НЕ:**

- Laravel runtime (нужен внешний Laravel проект)
- Frontend SPA (UI — это Vue/Vite на Client API)
- База данных или ORM напрямую

**Как внешний sub-agent вызывает его:**

```http
POST /api/a2a/sessions
{
  "projectId": "laravel-app-1",
  "mode": "agent",
  "projectRoot": "C:/path/to/laravel-project",
  "task": "Анализировать routes и миграции"
}
```

Затем: `POST /api/a2a/sessions/{id}/next` → poll `/async`.

**Действия:** register script actions в a2a-server → доступны как tool в LLM context.
   - Parsed by `action-parser.ts` (Sub-actions section → inline script)
   - All 445 tests pass, registry loads 19 actions including new one
- 2026-03-29 — **Additional server actions implemented:** `architecture-validator.md`, `batch-generate-patches.md`, `validate-config.md` → `a2a-server/src/actions/definitions/`
   - Each follows the sub-actions pattern with TypeScript code blocks
   - Ready for registration and testing
- 2026-03-29 — **Server actions implemented from laravel-agent-workspace-tools/scripts/**:
   - `cli-hub.md` — CLI command dispatch hub
   - `list-tickets.md` — Ticket listing and management
   - `migrate-php-components.md` — PHP component migration
   - `migrate-registry.md` — Scenario registry v2→v3 migration
   - `migrate-tests.md` — Test files migration (PHP, JS, TS)
   - `migrate-vue-components.md` — Vue/TypeScript migration
   - `process-response-patches.md` — AI response patch extraction
   - `restore.md` — File restoration from backup
   - `test-system.md` — System test execution
   - `validate-migration-scenarios.md` — Migration scenario validation
   - All actions load correctly, 445 a2a-server tests pass

---

## Laravel sub-agent profile (conceptual)

**Scope:** Strictly Laravel applications (PHP/Laravel repos, Artisan, Blade, migrations, queues, Horizon, Sanctum).

### How this repo maps to it

| Component | Mapping | Notes |
|-----------|---------|-------|
| Client API | Session driver | Create session with `mode: agent`, pass `projectRoot` pointing at Laravel app |
| Server actions | Tooling layer | Register `script` actions for Laravel-specific ops |
| Workbench | LLM content normalization | Structured sections for cheap/deterministic LLM context |
| greedy-dump | Tool library source | `priority-2/laravel-agent-workspace-tools` is the primary candidate |

### Candidate actions from `laravel-agent-workspace-tools`

| Script | Purpose | Server action potential |
|--------|---------|------------------------|
| `central-runner.js` | Orchestrator | Could become a `script` action |
| `create-orchestrator-task.js` | Task creation | `script` action |
| `debug-api.js`, `test-api-key.js` | API debugging | `script` actions |
| `apply-patches-*.js` | Patch management | `script` action |
| `cli-hub.js` | CLI hub for running commands | `script` action |
| `fast-patch.js` | Fast patch application | `script` action |
| `list-tickets.js` | List tickets (core function) | `script` action |
| `migrate-php-components.js` | Migrate PHP components | `script` action |
| `migrate-registry.js` | Migrate scenario registry | `script` action |
| `migrate-tests.js` | Migrate tests | `script` action |
| `migrate-vue-components.js` | Migrate Vue components | `script` action |
| `process-response-patches.js` | Process response patches | `script` action |
| `restore.js` | Restore from backups | `script` action |
| `test-system.js` | Test system functionality | `script` action |
| `validate-migration-scenarios.js` | Validate migration scenarios | `script` action |

### Economy rules for LLM content

- **One action key per step** (action-key shape)
- Batch file reads where safe
- Prefer sync mode (`DEFAULT_SYNC_MODE=1`) for quick ops
- Tables over prose in tool outputs
- No duplicate context across calls

### Next step

Implement server actions for the remaining high-value scripts from `laravel-agent-workspace-tools/scripts/` in batches, starting with the orchestrator and task creation scripts, followed by debugging and patch management, then migration utilities, and finally validation and testing scripts. Each action should follow the sub-actions pattern with inline TypeScript code where possible, or reference the original script for execution.

### Implementation Status (2026-03-29)

**COMPLETED:** All major scripts from `laravel-agent-workspace-tools/scripts/` have been implemented as server actions:

| Action | File | Status |
|--------|------|--------|
| normalize-env | `normalize-env.md` | ✅ Implemented |
| architecture-validator | `architecture-validator.md` | ✅ Implemented |
| batch-generate-patches | `batch-generate-patches.md` | ✅ Implemented |
| validate-config | `validate-config.md` | ✅ Implemented |
| cli-hub | `cli-hub.md` | ✅ Implemented |
| list-tickets | `list-tickets.md` | ✅ Implemented |
| migrate-php-components | `migrate-php-components.md` | ✅ Implemented |
| migrate-registry | `migrate-registry.md` | ✅ Implemented |
| migrate-tests | `migrate-tests.md` | ✅ Implemented |
| migrate-vue-components | `migrate-vue-components.md` | ✅ Implemented |
| process-response-patches | `process-response-patches.md` | ✅ Implemented |
| restore | `restore.md` | ✅ Implemented |
| test-system | `test-system.md` | ✅ Implemented |
| validate-migration-scenarios | `validate-migration-scenarios.md` | ✅ Implemented |

All actions load correctly, 445 a2a-server tests pass.

### Next: priority-2/a2a

Now that laravel-agent-workspace-tools is complete, the next focus is `priority-2/a2a` (goose, kilo, openhands, pilot-try). These appear to be TypeScript/Node.js agent frameworks with limited scripts in `scripts/` folders. No obvious high-value script candidates found yet - need deeper inspection of `pilot-try` packages if needed."- 2026-03-31 - Updated project lens with 5-8 bullet summary from README.md and AGENTS.md.
- 2026-03-31 - Completed sorting/description verification. All slices processed, checkboxes aligned with STATE. TASK-TREE.md and STATE.md cursor updated." 
"- 2026-03-31 - Completed project orientation and sorting/description of greedy-dump queue. All slices processed (priority-1, priority-2, priority-3, priority-5, priority-6, enggineered-prompts). Updated STATE and DOCUMENTS-STATE." 
