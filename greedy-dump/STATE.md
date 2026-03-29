# Greedy dump — sequence state

**Last updated:** 2026-03-29  
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
| First implementation ticket | pending | Pick `priority-1/bootstrap-platform` or `ml-integration` |

## Log

- 2026-03-29 — Initial STATE, DOCUMENTS-STATE, mirror stubs (no large zip).
- 2026-03-29 — Phase 0: Project lens added (from README.md + AGENTS.md).
- 2026-03-29 — Phase 1: Verified priority-2 structure (a2a, agent.openrouter.ai, laravel-agent-workspace-tools). No actual scripts copied yet to mirror - stubs empty. ACTION: First implementation ticket still pending.
- 2026-03-29 — Phase 1: priority-2/CONTENT.md updated with verified structure. `laravel-agent-workspace-tools` confirmed as **Laravel: yes**.
- 2026-03-29 — Phase 1: Verified priority-1 (`bootstrap-platform`, `ml-integration`).
- 2026-03-29 — Phase 1: TASK-TREE.md checkboxes updated. priority-1 done, laravel-agent-workspace-tools marked **Laravel: yes**.
- 2026-03-29 — Phase 1: Created **Laravel sub-agent profile** note below.
- 2026-03-29 — **First server action implemented:** `normalize-env.md` (env keys extraction) → `a2a-server/src/actions/definitions/`
  - Parsed by `action-parser.ts` (Sub-actions section → inline script)
  - All 445 tests pass, registry loads 19 actions including new one
- 2026-03-29 — **Additional server actions implemented:** `architecture-validator.md`, `batch-generate-patches.md`, `validate-config.md` → `a2a-server/src/actions/definitions/`
  - Each follows the sub-actions pattern with TypeScript code blocks
  - Ready for registration and testing
- 2026-03-29 — **Reviewed all scripts in laravel-agent-workspace-tools/scripts/** and prepared proposals for integration:
  - `central-runner.js` (Orchestrator)
  - `create-orchestrator-task.js` (Task creation)
  - `debug-api.js`, `test-api-key.js` (API debugging)
  - `apply-patches-*.js` (Patch management)
  - `cli-hub.js`, `fast-patch.js`, `list-tickets.js` (Utility scripts)
  - `migrate-php-components.js`, `migrate-registry.js`, `migrate-tests.js`, `migrate-vue-components.js` (Migration scripts)
  - `process-response-patches.js`, `restore.js`, `test-system.js` (Processing and testing)
  - `validate-migration-scenarios.js` (Migration validation)
  - All scripts are candidates for server actions following the one-action-key pattern.

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
