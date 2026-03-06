# Direct tests — centralized entry points

Scripts that run test/check flows **directly** (no test framework). Original files stay in project folders; here are runners and index.

## Locations (do not move originals)

| Area | Origin | Run from here |
|------|--------|----------------|
| **Scripts (root)** | `scripts/` | `scripts/run-*.ps1` |
| **RAG** | `a2a-client/packages/rag/scripts/` | `rag/run-*.ps1` |
| **SDK** | `a2a-client/packages/sdk/scripts/` | `sdk/run-*.ps1` |
| **AI integration** | `ai-integration/scripts/` | `ai-integration/run-*.ps1` |
| **Server sim** | `a2a-server/scripts/` | `server/run-*.ps1` |
| **Level 1–3 suite** | `scripts/tests/` | `.\scripts\tests\run-all.ps1` |

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

# RAG, SDK, AI, Server
.\scripts\direct-tests\rag\run-rag-test.ps1
.\scripts\direct-tests\sdk\run-server-connection.ps1
.\scripts\direct-tests\ai-integration\run-ai-integration.ps1
.\scripts\direct-tests\server\run-simulation.ps1
.\scripts\direct-tests\server\run-sim-lint.ps1
.\scripts\direct-tests\server\run-sim-create.ps1
```

Level 1–3 suite (unchanged):

```powershell
.\scripts\tests\run-all.ps1
```
