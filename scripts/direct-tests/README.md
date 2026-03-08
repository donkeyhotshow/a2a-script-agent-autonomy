# Direct tests — centralized entry points

Scripts that run test/check flows **directly** (no test framework). Original files stay in project folders; here are runners and index.

**See also:** [scripts/tests/](../tests/README.md) (Level 1–3 suite) · [Root README — Testing](../../README.md#testing)

| Entry | Purpose |
|-------|---------|
| [run-checks.ps1](run-checks.ps1) | Hub: health checks by scope (LLM, ServerLLM, ClientServer, …) |
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
.\scripts\direct-tests\run-checks.ps1 -Scope LLM
.\scripts\direct-tests\run-checks.ps1 -Scope ClientServerLLM
.\scripts\direct-tests\run-checks.ps1 -Scope Full
# Override ports/URLs:
.\scripts\direct-tests\run-checks.ps1 -Scope Full -ServerPort 3000 -ClientPort 3001 -WebPort 5173 -AiProxyUrl http://localhost:11435
```

## Dialog

```powershell
.\scripts\direct-tests\dialog\run-dialog-direct-ollama.ps1
.\scripts\direct-tests\dialog\run-dialog-direct-ollama.ps1 -RetryRequest "a2a-server\storage\requests\prom_xxx.json"
```

ai-integration uses FORWARD_TIMEOUT_SECONDS=180 (set in start-ai-integration.bat) for slow models.

## Locations (do not move originals)

| Area | Origin | Run from here |
|------|--------|----------------|
| **Scripts (root)** | `scripts/` | `scripts/run-*.ps1` |
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
.\scripts\direct-tests\scripts\run-test-services-basic.ps1
.\scripts\direct-tests\scripts\run-test-web-ui.ps1
.\scripts\direct-tests\scripts\run-test-a2a-client.ps1
.\scripts\direct-tests\scripts\run-web-ui-smoke-report.ps1
.\scripts\direct-tests\scripts\run-prod-test.ps1
.\scripts\direct-tests\scripts\run-pre-release.ps1

# RAG
.\scripts\direct-tests\rag\run-rag-test.ps1
.\scripts\direct-tests\rag\run-simple-rag-test.ps1
.\scripts\direct-tests\rag\run-test-rag-on-project.ps1
.\scripts\direct-tests\rag\run-test-perf.ps1
.\scripts\direct-tests\rag\run-test-scoring.ps1
.\scripts\direct-tests\rag\run-test-cached.ps1
.\scripts\direct-tests\rag\run-test-optimizations.ps1
.\scripts\direct-tests\rag\run-rag-batch-test.ps1
.\scripts\direct-tests\rag\run-rag-simulation.ps1

# SDK
.\scripts\direct-tests\sdk\run-server-connection.ps1

# AI integration
.\scripts\direct-tests\ai-integration\run-ai-integration.ps1
.\scripts\direct-tests\ai-integration\run-test-ai-integration-chain.ps1
.\scripts\direct-tests\ai-integration\run-test-promise-simulate.ps1
.\scripts\direct-tests\ai-integration\run-test-promise-daemon.ps1
.\scripts\direct-tests\ai-integration\run-test-cleanup.ps1
.\scripts\direct-tests\ai-integration\run-promise-chain.ps1
.\scripts\direct-tests\ai-integration\run-promise-chain-py.ps1

# Server simulations
.\scripts\direct-tests\server\run-simulation.ps1
.\scripts\direct-tests\server\run-sim-create.ps1
.\scripts\direct-tests\server\run-sim-lint.ps1
.\scripts\direct-tests\server\run-sim-run.ps1
.\scripts\direct-tests\server\run-sim-scaffold.ps1
.\scripts\direct-tests\server\run-sim-compare.ps1
.\scripts\direct-tests\server\run-sim-report.ps1
.\scripts\direct-tests\server\run-sim-validate.ps1
.\scripts\direct-tests\server\run-all-simulations.ps1
```

Level 1–3 suite: [scripts/tests/README.md](../tests/README.md)

```powershell
.\scripts\tests\run-all.ps1
```
