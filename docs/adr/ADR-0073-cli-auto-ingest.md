# ADR-0073: CLI Auto-Ingest (ANUS + cerebro-mcp style)

## Status
Approved

## Context
Developers often need to trigger agent tasks directly from their terminal without opening the Web UI. Tools like RA.Aid and ANUS provide a seamless CLI experience where the current directory's context is automatically ingested.

## Decision
Create a `bin/a2a.js` entry point that performs the following steps:
1. Detect current project root and git status.
2. Ingest relevant file context (glob matching).
3. Create a session on the local Client API and execute the task.
4. Stream logs/progress back to the terminal.

## Implementation
- Use `yargs` for CLI argument parsing.
- Implement an `ingestDir` utility for automatic context gathering.
- Communicate with `http://localhost:5173/api/a2a` via `node-fetch`.

## Consequences
- Faster developer feedback loop.
- "Talk -> Build" workflow directly from the terminal.
