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
| agent | Basic agent workflow |
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
