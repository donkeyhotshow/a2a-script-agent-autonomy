# Cancelled Task: Command Correction via Server API Route

**Status:** CANCELLED (preemptively — pattern identified before implementation)  
**Cancellation date:** 2026-04-18  
**Reason:** Command normalization must happen in the terminal adapter / orchestrator
preprocessing layer, never through a new server HTTP route.

---

## What was identified

The audit found a potential failure mode: when an LLM agent generates a malformed shell
command (e.g., Windows syntax on Linux, wrong flag format, dangerous pattern), the temptation
is to add a server route like `POST /api/a2a/commands/normalize` that receives the raw
command and returns a corrected one.

**This must NOT happen.**

## Why this would be wrong

1. **The server is a transport boundary**, not a command interpreter. Adding command
   normalization to the server couples execution semantics to the HTTP layer.
2. **Round-trip overhead**: sending a command to the server for normalization before
   executing it adds latency and a network hop that serves no purpose.
3. **Wrong abstraction level**: the server does not know the execution context (which OS,
   which shell, which sandbox, which working directory). Only the terminal adapter knows.
4. Violates "no new server routes for UI/execution convenience."

## Where command correction already lives (correct)

`a2a-client/packages/execution/src/terminal/`

| File | Responsibility |
|------|---------------|
| `command-analyze.cjs` | Safety analysis — blocks dangerous patterns (rm -rf /, shutdown, etc.) |
| `command-converter.cjs` | Converts emulated commands to MCP tool calls |
| `command-executor-wrapper.cjs` | Wraps execution with pre/post hooks |
| `terminal-handler-core.cjs` | Core terminal handler |
| `terminal-handler.cjs` | Full handler with retry and normalization |

## Correct future implementation for richer normalization

If the existing `command-converter.cjs` stubs need to be expanded (e.g., to handle
Windows→Linux syntax conversion, npm→pnpm rewrites, path normalization):

1. Expand `command-converter.cjs` in-place — it's the right file.
2. Add a `normalize(rawCommand: string, context: TerminalContext): string` function
   to `terminal-handler-core.cjs`.
3. Orchestrator preprocessing can call the terminal adapter's normalizer
   **before** executing, with full knowledge of the runtime context.
4. If AI-assisted normalization is needed (asking the LLM to fix its own command),
   this is an orchestrator-level retry loop, NOT a server route.

## Plugin hook for normalization

The plugin interface at `a2a-orchestrator/src/plugin-runtime/plugin.interface.ts`
defines `beforeExecute(command, context)` which is the correct extension point
for custom command normalization plugins.

## Files that should NOT be created

- `a2a-server/packages/server/src/routes/commands.routes.ts` ❌
- `a2a-server/packages/server/src/api/normalize-command.ts` ❌
- Any `POST /api/*/normalize` or `POST /api/*/correct-command` endpoint ❌
