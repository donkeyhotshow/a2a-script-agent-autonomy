# Project Documentation Rules (Non-Obvious Only)

- **Two-part project structure** - `a2a-server` (TypeScript backend) and `a2a-client` (JavaScript client with workspaces)
- **Server does NOT store client data** - Graph is passed in context and returned in response
- **Action definitions in MD files** - Located at `a2a-server/src/actions/definitions/` for no-AI mode
- **PhaseMachine drives request flow** - Phases: idle → discovery → recognition → analysis → action → validation → completed
- **Client packages** - `agent`, `api-client`, `fs-utils`, `rag`, `script-runner` under `a2a-client/packages/`
