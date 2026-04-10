# Async Simulation Template

This directory contains async simulations that model the full A2A protocol flow including:
- `promiseId` for long-running operations
- Polling for async results
- `execute.wait` state handling

## Structure

Each async simulation follows the pattern:

```
{simulation-name}/
├── {step}/
│   ├── client.json         # Client request (may include sync: false or expect promiseId)
│   ├── received.json       # Server received request
│   ├── request.json        # Request to LLM/processing
│   ├── request.md           # Markdown for LLM
│   ├── response.json       # Server response with promiseId
│   ├── response.md         # LLM response markdown
│   ├── server-transforms-request.json
│   ├── server-transforms-response.json
│   └── promise-poll.json   # Polling for result (async flow)
│       └── promise-result.json  # Final result when ready
```

## Key Differences from Sync

| Aspect | Sync | Async |
|--------|------|-------|
| Response | Immediate `execute` | `promiseId` for polling |
| Flow | client → result | client → promise → poll → result |
| Simulation | `client.json → received.json` | Full `promiseId` lifecycle |

## Running Async Simulations

```bash
npm run sim:validate -- --path simulations/async/{simulation-name}
```
