# Project Documentation Rules (Non-Obvious Only)

- **Two-part project structure** - `a2a-server` (TypeScript backend) and `a2a-client` (JavaScript client with workspaces)
- **Server does NOT store client data** - Graph is passed in context and returned in response
- **Action definitions in MD files** - Located at `a2a-server/src/actions/definitions/` for no-AI mode, each contains sub-actions with TypeScript code
- **PhaseMachine drives request flow** - Phases: idle → discovery → recognition → analysis → action → validation → completed
- **Client packages** - `agent`, `api-client`, `fs-utils`, `rag`, `script-runner` under `a2a-client/packages/`
- **Protocol version 1.0** - Context blocks use version field, see [`types/index.ts`](a2a-server/src/types/index.ts:7-17)
