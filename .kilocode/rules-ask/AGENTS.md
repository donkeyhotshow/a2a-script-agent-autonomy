# Project Documentation Rules (Non-Obvious Only)

- **Two-part project structure** - `a2a-server` (TypeScript backend) and `a2a-client` (JavaScript client with workspaces)
- **Action definitions in MD files** - Located at `a2a-server/src/actions/definitions/` for no-AI mode, each contains sub-actions with TypeScript code
- **Protocol version 1.0** - Context blocks use version field, see [`types/index.ts`](a2a-server/src/types/index.ts:7-17)
- **Web UI is vanilla JS + VueFlow** - Located in `a2a-client/web/`, uses vanilla JavaScript (not React/Vue framework), VueFlow for graph visualization
