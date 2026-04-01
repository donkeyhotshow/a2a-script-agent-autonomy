# Sync Simulations

This directory contains synchronous simulations that model the A2A protocol with immediate execution (no `promiseId`).

## Structure

Each step folder may contain up to the full pipeline (see [`../SCHEMA.md`](../SCHEMA.md)):

```
{simulation-name}/
├── {step}/
│   ├── client.json                      # Web → Client API
│   ├── request.json                     # Client API → Server
│   ├── server-transforms-request.json   # Pre-LLM transforms (required for no-LLM steps)
│   ├── request.md                       # Server → LLM (when the step calls the LLM)
│   ├── response.md                      # LLM → Server (when the step calls the LLM)
│   ├── server-transforms-response.json  # Post-LLM transforms (only with response.md)
│   ├── response.json                    # Server → Client API (canonical execute)
│   └── received.json                    # Client API → Web (sanitized execute DTO)
├── description.md                       # Simulation description (recommended)
└── analysis.md                          # Optional notes
```

## Available Simulations

| Simulation | Description |
|------------|-------------|
| agent | Full agent execute coverage in one chain (15 steps, no LLM in fixtures); repo paths + workbench like `agent-coder-smart` |
| agent-analyze | Agent with analysis step |
| agent-auto-ai | Agent with auto AI |
| agent-coder | Coding agent |
| agent-coder-smart | Smart coding agent |
| agent-workspace-tools | Agent with workspace tools |
| dialog | Dialog workflow |
| fix-laravel-namespaces-and-uses | Laravel namespace fix |
| fix-vue-imports | Vue import fixes |
| fix-vue-imports-batched | Batched Vue fixes |
| fix-vue-imports-decline | Declined Vue fixes |
| interrupt-thinking | Thinking interrupt |
| invoke-form-confirmation | Form confirmation |
| invoke-simulation-record | Simulation record |
| orchestrator-dialog | Orchestrator dialog |
| phpunit-deprecations | PHPUnit deprecations |
| resilience-contract | Resilience contract |
| script | **Central** scripted E2E (10 steps): router → forms → `script`×3 ↔ client → `run-script` → gate → `execute-command` → summary → follow-up ([`script/description.md`](script/description.md)) |
| task-decomposition | Task decomposition |

## Running validation

`sim-validate` and `sim-lint` accept **`--sim <relative-path>`** or **`--all`**. There is no `--path` filter; scope by simulation name (e.g. steps under `sync/dialog/` are validated as `sync/dialog/1`, `sync/dialog/2`, …).

From repo root:

```bash
npm run sim:validate -- --all
npm run sim:validate -- --all --step-contract
npm run sim:validate -- --sim sync/dialog/1
```

From `a2a-server`:

```bash
npx tsx scripts/sim-validate.ts --sim sync/dialog/1 --step-contract
```

## Key characteristics

- **Sync mode:** immediate execution, no `promiseId` in goldens (see [`SCHEMA.md`](../SCHEMA.md) for async scope).
- **Pipeline order:** `client.json` → `request.json` → … → `response.json` → `received.json` (Web DTO is derived **after** the server response).
- **Use case:** simple operations, form interactions, deterministic scripted flows, and LLM steps where `request.md` / `response.md` are present.
- **LLM snapshot coverage:** Not all sync simulations include `request.md` / `response.md` (LLM prompt/response pairs). Goldens without these files are **shape-only** tests — they validate execute shape and transform contracts but do not test prompt assembly, `render-markdown`, `pick-context`, or per-action request templates in `a2a-server/prompts/`. High-value flows currently lacking LLM fixtures include many `fix-vue-imports*`, `fix-laravel-*`, `phpunit-deprecations`, `resilience-contract`, `orchestrator-dialog`, and several `task-decomposition` steps.

## Substeps (`N-sub-M` folders)

Some sync simulations include **substep folders** (e.g., `agent-auto-ai/3-sub-1`) for server interrupt-loop goldens. These document internal server LLM/transform turns that are not exposed to the web client. Behavior:

- **`sim-lint`** walks substep folders when linting the parent simulation and validates JSON there.
- **`sim-validate --all`** includes substep paths by default (same schema rules as numeric steps). Pass **`--skip-substeps`** to exclude them.
- Substeps contain `request.*` / `response.*` + server-transforms but **no** `client.json` / `received.json`.
- Documentation: see [`../SCHEMA.md`](../SCHEMA.md) section "Supplementary: server interrupt loop (optional)".
