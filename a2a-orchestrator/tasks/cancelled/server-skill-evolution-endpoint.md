# Cancelled Task: Server-Side Skill Evolution via /api/tools/evolve

**Status:** CANCELLED  
**Cancellation date:** 2026-04-18  
**Reason:** Wrong layer — dynamic code deployment through a server HTTP route violates the
"no new server routes for execution convenience" rule and conflates plugin runtime with
HTTP transport.

---

## What was built

`a2a-server/packages/server/src/api/tools-evolve.ts`

- `POST /api/tools/evolve` — accepts `{ toolName, toolCode }`, validates the code with a
  TypeScript sandbox, writes a `.skill.ts` file to `a2a-server/src/skills/custom/`, then
  hot-reloads the SkillRegistry.
- Protected by `registryAuth` middleware (SKIP_AUTH dev bypass).
- The sandbox (`tools-evolve-sandbox.ts`) uses static pattern deny-lists and a `node:vm` run
  to block obvious escapes (`eval`, `child_process`, `process.exit`, etc.).

## Why this is wrong

1. **Dynamic code write to the server filesystem at runtime** is an inherently high-risk
   pattern regardless of sandbox quality. The sandbox can be incomplete.
2. **The server is a transport boundary**, not a plugin host. Deploying code through an HTTP
   route means the server's own process tree is the attack surface.
3. **The SkillRegistry is a stub** (`register`, `get`, `list` all no-op). The hot-reload
   path calls `registry.init()` which does not actually reload modules in a running Node.js
   ESM process.
4. Adding a new `POST /api/tools/evolve` route violates the rule "no new server routes
   without extreme necessity" — skill evolution is not a transport concern.

## Where this should live

| Concern | Correct layer |
|---------|--------------|
| Defining a plugin / skill interface | `a2a-orchestrator/src/plugin-runtime/plugin.interface.ts` |
| Plugin discovery & lifecycle | `a2a-orchestrator/src/plugin-runtime/plugin-manager.ts` |
| Code validation / sandboxing | `a2a-orchestrator/src/plugin-runtime/plugin-sandbox.ts` |
| Exposing new tools to sessions | Orchestrator injects them before the next LLM turn |
| Admin deploy of new plugin code | CLI tool / file-drop into a watched directory, NOT an HTTP route |

## Files affected

- `a2a-server/packages/server/src/api/tools-evolve.ts` — the endpoint (keep but gate behind `allowToolsEvolve: false`)
- `a2a-server/packages/server/src/tools-evolve-sandbox.ts` — sandbox code (reusable in plugin-manager)
- `a2a-server/packages/server/src/skills/SkillRegistry.ts` — stub registry
- `a2a-server/packages/server/src/app.ts` — mounts `POST /api/tools` route

## What can be reused

- `tools-evolve-sandbox.ts` static deny patterns and `SandboxViolationError` are solid and
  should be imported by the future `plugin-sandbox.ts`.
- The toolName regex validation (`/^[a-zA-Z_][a-zA-Z0-9_]*$/`) is correct and should be
  kept wherever plugins are named.

## Correct future implementation

```
a2a-orchestrator/src/plugin-runtime/
  plugin.interface.ts     — PluginDefinition interface (id, match, transform, hooks)
  plugin-manager.ts       — load / unload / list plugins from a watched directory
  plugin-sandbox.ts       — validate code before loading (port sandbox logic here)
  built-in/               — built-in plugins shipped with the orchestrator
```

The orchestrator, not the server, hosts the plugin manager. The server only calls
`orchestrator.process(sessionId, input)` and never knows about individual plugins.
