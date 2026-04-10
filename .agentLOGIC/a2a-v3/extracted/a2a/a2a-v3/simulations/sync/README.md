# Sync Simulations

This directory contains synchronous simulations that model the A2A protocol with immediate execution (no `promiseId`).

## Structure

Each sync simulation follows the basic pattern:

```
{simulation-name}/
├── {step}/
│   ├── client.json         # Client request
│   ├── received.json       # Server received request
│   ├── request.json        # Request to LLM/processing
│   ├── request.md          # Markdown for LLM
│   ├── response.json       # Server response (immediate execute)
│   ├── response.md         # LLM response markdown
│   ├── server-transforms-request.json
│   └── server-transforms-response.json
├── description.md          # Simulation description
└── analysis.md            # Post-simulation analysis (optional)
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

## Running Sync Simulations

```bash
# Run all sync simulations
npm run sim:validate -- --path simulations/sync

# Run specific simulation
npm run sim:validate -- --path simulations/sync/dialog
```

## Key Characteristics

- **Sync Mode**: Immediate execution, no `promiseId`
- **Flow**: `client.json → received.json → response.json`
- **Use Case**: Simple operations, form interactions, quick responses
