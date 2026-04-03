# DEV_STATE - 2026-04-03

**Self-Upgrade:** Process of system self-improvement via daemon script `monitor-and-process-tasks.js` or manual API dialog with agent. See [GLOSSARY.md](GLOSSARY.md). In this repo, **“doing work” = executing concrete tasks _and_, when that queue is empty, driving prompts through the Client API / monitor until new concrete, testable tasks appear and are written back into `tasks/` + `DEV_STATE`**. **Operator order:** advance `tasks/` / `tasks/ide-prompts/` first; **before large session volume**, archive needed `a2a-client/storage/sessions/` ([`tasks/README.md`](tasks/README.md) step 2, *Session archival*); run `prompts-to-agent-mode/` (monitor / session API) after — policy only, not enforced in code ([`tasks/README.md`](tasks/README.md) *Self-Upgrade order*).

**Doc:** Schema-debug entry point: [`tests/direct-tests/README.md`](tests/direct-tests/README.md) (hub moved from `scripts/direct-tests/`; stub [`scripts/direct-tests/README.md`](scripts/direct-tests/README.md) redirects), [`simulations/SCHEMA.md`](simulations/SCHEMA.md), [`AGENTS.md`](AGENTS.md).

**Agent-mode task prompts (Task Monitor scans this folder only):** [`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md); **IDE/docs prompts (not in monitor scan):** [`tasks/ide-prompts/README.md`](tasks/ide-prompts/README.md); **live stack contract:** [`prompts-to-agent-mode/STACK-RUN.md`](prompts-to-agent-mode/STACK-RUN.md); **linear workflow:** [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md); **root master prompt (full index run):** [`START-FULL-SPECTRUM.md`](START-FULL-SPECTRUM.md) — Client API + seed **`mode: "agent"`** (not `invoke` alone; see `AGENTS.md` *Unified manual path*).

**System roadmap:** [`tasks/system-improvement-priorities.md`](tasks/system-improvement-priorities.md) (contract unification, gray room, verification pyramid, observability).

**Open work (authoritative queue):** [`work/STATE.md`](work/STATE.md) — table *Очередь задач*. Root file keeps narrative only; do not treat a single line here as the row-by-row status.

Current system state: **Stack готов** - все сервисы работают; `sim:validate -- --all --step-contract` зелёный.

**Sequence queue checks:** `npm run verify:gray-room -- <snapshot.json>` (or `--stdin`) — offline validation of `context.workbench.sections.sequence` / `predictions` / `history`; [`tests/direct-tests/validators/verify-gray-room-state.mjs`](tests/direct-tests/validators/verify-gray-room-state.mjs).

**Recent (operator / parity batch):** Task Monitor with promise queue support; Client API multi-provider LLM routing; session storage improvements.

**Fixed (artifact paths):** Windows `scripts\start-*.bat` and `start-all.bat` / `kill-all.bat` now `cd` to repo root via `%~dp0` so logs land in `a2a-client/logs`, `a2a-server/logs` (not nested `a2a-client/a2a-client/...`). `start-all.sh` / `start-all.ps1` anchor to script directory. Proxy request dumps from `proxy_handler.py` use `proxy_logs/requests/request_*` (aligned with `request_processor.py`); `cleanup.py` prunes both `requests/` and legacy top-level `request_*`.

**Fixed:** Router no longer overwrites `execution.action` when session created with `mode: "agent"`. `isTaskRequest()` in `base-processor.ts` now checks if `execution.action` is already an LLM pipeline action and returns `false` to prevent forced routing. Added direct LLM pipeline handling in `action-request-processor.ts` for seeded agent mode.

**Recent (client UI):** Async polling improvements; sticky router prevention with localized text mapping.

**Recent (direct-tests):** Post-start checks; sticky router testing improvements; router choice validation; `validators/lib/check-llm-execute-shape.mjs` shared by `scan-promise-bodies` + `scan-session-responses`; root `npm run sim:check-md` delegates to a2a-server MD/JSON drift check.

**Recent (simulations):** MD mirrors for async sims; unified SCHEMA.md scope; gray room goldens; router descriptions audit; S11 mirror sweep completed.

**Recent (docs):** Completed task notes from `tasks/completed/` folded into `docs/` (see `docs/new-request-flow/SIMULATION-VALIDATION.md` *Sync golden conventions*, `docs/ARCHITECTURE-IMPROVEMENTS-PROPOSALS.md` Category D, `docs/agent-iteration-traps.md` *Task Monitor*, `docs/WORKFLOW.md` *Task Monitor metrics*, `docs/SESSION-SYSTEMS-OVERVIEW.md` *Execution mode parity*, `docs/adr/ADR-0059` Related); `tasks/completed/*.md` removed.

**Pre-existing issues (known):**
- a2a-client: `@a2a/rag` tests green — Vitest `fs/promises` hoisted mocks + BM25 `minScore` / corpus fixes (`packages/rag/tests/rag.test.js`).
- Orchestrator metrics: requires periodic updates
- **S18 (partial):** `a2a-client` dev `vite.config.js` `root: web`, workspace `web` + `@a2a-client/vite-plugin`; physical move to `packages/web` still pending ([`tasks/pending/a2a-client-web-scoped-package.md`](tasks/pending/a2a-client-web-scoped-package.md)).

## System Backlog:
- **Architecture - Gray Room Refinement**: Refine Gray Room implementation per work/STATE.md focus §3
- **Architecture - Black Room / Gray Room Split**: Implement Black Room / Gray Room Split concept from ADR-0058
- **S18 (partial):** Complete `@a2a-client` web + vite-plugin scoped package migration

---

## Ports

| Port | Component |
|------|-----------|
| 11435 | Ollama |
| 11434 | AI Integration |
| 3000 | a2a-server |
| 5173 | Vite + Client API |

---

## Health Checks

```bash
curl http://localhost:3000/health
curl http://localhost:11434/health
curl http://localhost:11435/api/tags
curl http://localhost:5173/api/a2a/projects
```

---

## Subsystems

| Module | State |
|--------|-------|
| a2a-client | [DEV_STATE.md](a2a-client/DEV_STATE.md) |
| a2a-server | [DEV_STATE.md](a2a-server/DEV_STATE.md) |
| ai-integration | [DEV_STATE.md](ai-integration/DEV_STATE.md) |

---

## Testing

`tests/direct-tests/e2e-dialog-test.js`: added 8 server-only cases (invoke 400s, `/health` JSON, `/api/v1/requests/*` batch/single).

```bash
npm run sim:lint -- --all
npm run sim:validate -- --all
cd a2a-server && npm run test
cd a2a-client && npm test
```

---

## Cross-Module: Multi-Provider Model Selection

**Status:** Done (API path) — Combined `GET /api/tags` with `provider`; invoke / context **`llmModel`** and Client API **`POST /sessions` { llmModel }** propagate to dialog + gray room (`resolveLlmModelFromContext`). ADR-0059. Optional: Web UI dropdown.

**Goal:** Enable model selection throughout the stack (Z.AI `glm-4.7-flash` vs Ollama `qwen3:8b`).

**Done:**
1. **a2a-server:** `context.llmModel` + top-level invoke `llmModel` → AI Hub `/api/chat` body `model`
2. **a2a-client:** Session create + `/next` merge `llmModel`; full UI picker optional
3. **Shared:** ADR-0059