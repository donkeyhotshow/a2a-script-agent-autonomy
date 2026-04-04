# Direct tests — centralized entry points

## Schema debugging — start here

**Mandatory order** (same as [`AGENTS.md`](../../AGENTS.md)): reproduce and isolate **execute/result JSON shape** problems in **`tests/direct-tests`** first (dialog runners, `e2e-dialog-test.js`, health checks). Only after that escalate to full session flows, **`npm run sim:lint` / `sim:validate`**, or heavy e2e. This folder is the repo’s **first** stop for schema debugging — not simulations.

**Validators** ([`validators/README.md`](validators/README.md)) are **standalone scripts** (not Vitest) that **list concrete contract mistakes** — very useful before deep UI or sim debugging. They cover LLM/proxy `body.md`, session `server-response.json`, gray-room snapshots, router `choices[].description`, and sim `request.md`/`response.md` vs `*.json` drift (`npm run sim:check-md`). Run from repo root; see the validators README for the full table.

| If you are debugging… | Use |
|------------------------|-----|
| Wrong `execute` / `result` keys, router beats, Client API session steps | [Dialog](#dialog), `dialog/run-dialog-direct-ollama.ps1`, `e2e-dialog-test.js` |
| **Sticky router** (same `form.choices` again after a router choice, or `task`/`router` never clears) | `node tests/direct-tests/e2e-dialog-test.js --only=routerAgentNoLoop` — also `routerAgentNoLoopTaskShorthand`, `routerAgentNoLoopUtf8Task`, **`routerDialogNoLoop`** / **`routerDialogNoLoopTaskShorthand`** (after **dialog** choice), `routerWrongBeatMessage`. Replay: `replay-session-from-disk.js … --assert-no-sticky-router`. **Direct server invoke repro (fast scripted choice):** `node tests/direct-tests/router-choice-transition-run.mjs` — uses keyword task → `fix-vue-imports` choice (no LLM dialog pipeline). Vitest: `router-choice-transition.test.mjs` validates `server-invoke-request.schema.json` + optional live check when `GET {A2A_SERVER_URL}/health` is OK (default `http://127.0.0.1:3000`) |
| **Replay a saved session folder** (`client-result.json` per step) | [replay-session-from-disk.js](#replay-saved-session-steps) — needs UTF-8 `replay-create.json` (or path arg) matching how the session was opened |
| Stack reachability before deep JSON work | [run-checks.ps1](#hub-checks-by-stack-part) (`-Scope …`) |

**See also:** [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) (golden sim contract — **after** direct reproduction).

**Vitest (`npm run test:direct-tests`):** schema guards in [`lib/`](lib/) always run; `router-choice-transition.test.mjs` runs live server checks only when `A2A_SERVER_URL` (default `http://localhost:3000`) responds on `/health`.

**Hardening / reduce LLM work:**
- `--only=case1,case2` — run specific cases only (e.g., `--only=routerAgentNoLoop,routerDialogNoLoop`)
- `E2E_DIRECT_LOW_LLM=1` — enables both merges below
- `E2E_DIRECT_MERGE_INVOKE=1` — one sync invoke replaces 3 cases (3→1 LLM)
- `E2E_DIRECT_MERGE_CLIENT_SESSION_SCHEMA=1` — one session replaces 9 cases (9→1 session)

Subset examples:
```powershell
# Router regression only (fast, LLM-light)
node tests/direct-tests/e2e-dialog-test.js --only=routerAgentNoLoop,routerAgentNoLoopTaskShorthand,routerAgentNoLoopUtf8Task,routerDialogNoLoop,routerDialogNoLoopTaskShorthand,routerWrongBeatMessage

# Health checks only (no LLM)
node tests/direct-tests/e2e-dialog-test.js --only=clientProjects,serverHealth,serverHealthJson
```

**Manual full direct suite (Papa):** [`run-post-start-all.ps1`](run-post-start-all.ps1) — hub (`run-checks.ps1` with Client **3001** / Web **5173**), Vitest, `router-choice-transition.test.mjs`, full `e2e-dialog-test.js`, `gray-room-test.js`, `test-dialog-flow.ps1`, `test-agent-flow.ps1`, `server-invoke-agent.ps1`. Set **`A2A_POST_START_SKIP_HEAVY=1`** to skip LLM-heavy steps (hub + Vitest + router + short e2e subset only). **`start-all.bat` does not run this** — see [PAPA-MAMA.md](../../PAPA-MAMA.md).

---

Scripts that run test/check flows **directly** (no test framework). Original files stay in project folders; here are runners and index.

**See also:** [scripts/tests/](../../scripts/tests/README.md) (Level 1–3 suite) · [Root README — Testing](../../README.md#testing)

| Entry | Purpose |
|-------|---------|
| [validators/](validators/) | Standalone validators (not Vitest); see [validators/README.md](validators/README.md) |
| [validators/scan-promise-bodies.mjs](validators/scan-promise-bodies.mjs) | `npm run scan-promise-bodies` — proxy promise `body.md` LLM JSON |
| [validators/scan-session-responses.mjs](validators/scan-session-responses.mjs) | `npm run scan-session-responses` — `storage/sessions/**/server-response.json` (same shape rules; noisy) |
| [validators/verify-gray-room-state.mjs](validators/verify-gray-room-state.mjs) | `npm run verify:gray-room -- <snapshot.json>` — sequence / workbench snapshot |
| [validators/audit-sim-choice-descriptions.mjs](validators/audit-sim-choice-descriptions.mjs) | `npm run audit:sim-choice-descriptions` — simulation `choices[].description` |
| [run-checks.ps1](run-checks.ps1) | Hub: health checks by scope (LLM, ServerLLM, ClientServer, …) |
| [run-post-start-all.ps1](run-post-start-all.ps1) | Chains hub + Vitest + node + PS1 flows; run manually after the stack is up ([PAPA-MAMA.md](../../PAPA-MAMA.md)) |
| [scripts/](scripts/) | Runners → `scripts/tests/` and root `scripts/` (prod-test, pre-release, web-ui-smoke-report) |
| [dialog/](dialog/) | Dialog flow with direct Ollama (bypass ai-integration timeout) |
| [rag/](rag/), [sdk/](sdk/), [ai-integration/](ai-integration/), [server/](server/) | Runners → packages (RAG, SDK, AI, sim) |

---

## Hub: checks by stack part

[run-checks.ps1](run-checks.ps1) — single entry to run health checks for a chosen part of the stack (no service startup):

| Scope | Checks |
|-------|--------|
| `LLM` | Ollama + AI proxy |
| `ServerLLM` | Server + Ollama + AI proxy |
| `ClientServer` | Client API + Server |
| `ClientServerLLM` | Client + Server + Ollama + AI proxy |
| `WebClient` | Web UI + Client API |
| `WebClientServer` | Web + Client + Server |
| `Full` | Web + Client + Server + LLM |

```powershell
.\tests\direct-tests\run-checks.ps1 -Scope LLM
.\tests\direct-tests\run-checks.ps1 -Scope ClientServerLLM
.\tests\direct-tests\run-checks.ps1 -Scope Full
# Override ports/URLs:
.\tests\direct-tests\run-checks.ps1 -Scope Full -ServerPort 3000 -ClientPort 5173 -WebPort 5173 -AiProxyUrl http://localhost:11435
```

## Dialog

**No mocks.** Requires Client API (5173) + a2a-server (3000).

```powershell
# Full dialog chain: task -> choices -> choice dialog -> input -> message -> message
.\tests\direct-tests\test-dialog-flow.ps1

# With Ollama checks + retry helper
.\tests\direct-tests\dialog\run-dialog-direct-ollama.ps1
.\tests\direct-tests\dialog\run-dialog-direct-ollama.ps1 -RetryRequest "a2a-server\storage\requests\prom_xxx.json"
```

ai-integration uses FORWARD_TIMEOUT_SECONDS=180 (set in start-ai-integration.bat) for slow models.

## Artifact tracking and cleanup

Direct Node-based tests (`e2e-dialog-test.js`, `gray-room-test.js`) record the client sessions and server promiseIds they create into `artifacts-registry.json` in this folder.

To remove those artifacts and run ai-integration cleanup after a batch of direct tests:

```powershell
.\tests\direct-tests\cleanup-artifacts.ps1
```

What it does:

- Deletes recorded Client API sessions via `DELETE /api/a2a/sessions/:id`
- Deletes matching A2A Server request files from `a2a-server/storage/requests/{promiseId}.json`
- Runs `tests/direct-tests/ai-integration/run-test-cleanup.ps1` to clear ai-integration requests/promises/cache
- Clears `tests/direct-tests/artifacts-registry.json`

## Replay saved session steps

[`replay-session-from-disk.js`](replay-session-from-disk.js) creates a **new** session and reapplies each step’s `client-result.json` from a captured `a2a-client/storage/sessions/sess_*/` tree. Disk payloads with mojibake will not match a healthy UTF-8 UI — build **`replay-create.json`** in that folder (or pass a second path) with the same `mode` / `task` / `title` you used in the browser.

```powershell
# Inspect what would be sent (no HTTP)
node tests/direct-tests/replay-session-from-disk.js a2a-client/storage/sessions/sess_EXAMPLE --dry-run

# After writing replay-create.json next to the session (UTF-8), e.g. {"mode":"agent","task":"…","title":"…"}
node tests/direct-tests/replay-session-from-disk.js a2a-client/storage/sessions/sess_EXAMPLE

# Or pass create body explicitly
node tests/direct-tests/replay-session-from-disk.js a2a-client/storage/sessions/sess_EXAMPLE path/to/create.json

# Fail exit 1 if a router choice /next leaves the session on task/router with form.choices (dev: includeContext)
node tests/direct-tests/replay-session-from-disk.js a2a-client/storage/sessions/sess_EXAMPLE --assert-no-sticky-router
```

## Locations (do not move originals)

| Area | Origin | Run from here |
|------|--------|----------------|
| **Scripts (root)** | `scripts/` | `scripts/run-*.ps1` (port 5173) |
| **RAG** | `a2a-client/packages/rag/scripts/` | `rag/run-*.ps1` |
| **SDK** | `a2a-client/packages/sdk/scripts/` | `sdk/run-*.ps1` |
| **AI integration** | `ai-integration/scripts/` | `ai-integration/run-*.ps1` |
| **Server sim** | `a2a-server/scripts/` | `server/run-*.ps1` |
| **Level 1–3 suite** | [`scripts/tests/`](../tests/README.md) | `.\scripts\tests\run-all.ps1` |

## Scripts (`scripts/`)

- `test-services-basic.ps1`, `test-web-ui.ps1`, `test-a2a-client.ps1` — services / web / client checks
- `web-ui-smoke-report.ps1` — smoke report from logs
- `prod-test.js` — production test requests (Client API → Server → Ollama)
- `pre-release.js` — pre-release validation

## RAG (`a2a-client/packages/rag/scripts/`)

- `rag-test.js`, `simple-rag-test.js` — RAG search
- `test-rag-on-project.js`, `test-perf.js`, `test-scoring.js`, `test-cached.js`, `test-optimizations.js`
- `rag-batch-test.js`, `rag-testing-simulation.js`, `run-rag-simulation.js`
- `collect-rag-responses.js`, `prebuild-indexes.js`

## SDK (`a2a-client/packages/sdk/scripts/`)

- `test-server-connection.ts`

## AI integration (`ai-integration/scripts/`)

- `test_ai_integration.py`, `test_ai_integration_chain.py`
- `test_promise_simulate.py`, `test_promise_daemon.py`
- `test_cleanup.py`
- `tests/promise_chain.py`

## Server (`a2a-server/scripts/`)

- `sim-create.ts`, `sim-scaffold.ts`, `sim-lint.ts`
- `sim-run.ts`, `sim-compare.ts`, `sim-report.ts`, `sim-validate.ts`
- `run-simulation.ts`, `run-all-simulations.ts`

## Usage

From repo root:

```powershell
# Scripts (root)
.\tests\direct-tests\scripts\run-test-services-basic.ps1
.\tests\direct-tests\scripts\run-test-web-ui.ps1
.\tests\direct-tests\scripts\run-test-a2a-client.ps1
.\tests\direct-tests\scripts\run-web-ui-smoke-report.ps1
.\tests\direct-tests\scripts\run-prod-test.ps1
.\tests\direct-tests\scripts\run-pre-release.ps1

# RAG
.\tests\direct-tests\rag\run-rag-test.ps1
.\tests\direct-tests\rag\run-simple-rag-test.ps1
.\tests\direct-tests\rag\run-test-rag-on-project.ps1
.\tests\direct-tests\rag\run-test-perf.ps1
.\tests\direct-tests\rag\run-test-scoring.ps1
.\tests\direct-tests\rag\run-test-cached.ps1
.\tests\direct-tests\rag\run-test-optimizations.ps1
.\tests\direct-tests\rag\run-rag-batch-test.ps1
.\tests\direct-tests\rag\run-rag-simulation.ps1

# SDK
.\tests\direct-tests\sdk\run-server-connection.ps1

# AI integration
.\tests\direct-tests\ai-integration\run-ai-integration.ps1
.\tests\direct-tests\ai-integration\run-test-ai-integration-chain.ps1
.\tests\direct-tests\ai-integration\run-test-promise-simulate.ps1
.\tests\direct-tests\ai-integration\run-test-promise-daemon.ps1
.\tests\direct-tests\ai-integration\run-test-cleanup.ps1
.\tests\direct-tests\ai-integration\run-promise-chain.ps1
.\tests\direct-tests\ai-integration\run-promise-chain-py.ps1

# Server simulations
.\tests\direct-tests\server\run-simulation.ps1
.\tests\direct-tests\server\run-sim-create.ps1
.\tests\direct-tests\server\run-sim-lint.ps1
.\tests\direct-tests\server\run-sim-run.ps1
.\tests\direct-tests\server\run-sim-scaffold.ps1
.\tests\direct-tests\server\run-sim-compare.ps1
.\tests\direct-tests\server\run-sim-report.ps1
.\tests\direct-tests\server\run-sim-validate.ps1
.\tests\direct-tests\server\run-all-simulations.ps1
```

Level 1–3 suite: [scripts/tests/README.md](../../scripts/tests/README.md)

```powershell
.\scripts\tests\run-all.ps1
```

## Router Choice Transition Test

Direct server-side check for **sticky router** (router `form.choices` repeating after a valid `result.choice`).

```powershell
# Requires: a2a-server on :3000
node tests/direct-tests/router-choice-transition-run.mjs

# Custom server URL (used by fetch in the script)
$env:A2A_SERVER_URL="http://127.0.0.1:3000"; node tests/direct-tests/router-choice-transition-run.mjs
```

What it does:
1. `POST /api/v1/invoke` with **`{ task: "fix vue imports", sync: true }`** (first-request schema branch) → expect router `execute.form.choices`.
2. Second invoke with **`context.session_id: "stateless"`** + **`context.task` + `context.execution` + `result.choice: "fix-vue-imports"`** → expect **no** router form again (scripted registry action). (Invoke responses may omit `session_id`; explicit `stateless` matches the server default contour.)

For LLM pipeline choices (`dialog` / `agent` / `task-decomposition`), use the **Client API** session flow (`e2e-dialog-test.js` cases above) — those paths invoke the dialog processor and are not duplicated here.
