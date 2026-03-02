# fix-vue-imports (client validation)

> **Type: Actions** (server-managed workflow)

This simulation demonstrates a **server-controlled workflow** where the server defines the exact sequence of steps. The client executes each step and returns results, without making autonomous decisions.

## Behavior

The server sends a predefined list of actions (`actions[]`) that the client must execute in order:

| Step | Server sends | Client must send |
|------|--------------|------------------|
| 1 | Form with choices (fix-vue-imports, auto-ai, task-decomposition) | context + result.choice |
| 2 | execute.script (vue-import-detect) | context + result.broken_imports |
| 3 | execute.script (vue-import-resolve) | context + result.patches |
| 4 | execute.script (vue-import-apply) | context + result.fixed_files |
| 5 | execute.script (vue-import-cleanup) + finalResult | (new task or end) |
