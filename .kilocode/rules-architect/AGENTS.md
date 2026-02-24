# Project Architecture Rules (Non-Obvious Only)

- **Server does NOT store client data** - Graph is passed in context and returned in response; stateless design
- **PhaseMachine drives request flow** - State machine with phases: idle → discovery → recognition → analysis → action → validation → completed
- **ActionProcessor for no-AI mode** - Executes actions from MD definition files without AI calls
- **Request processor is timer-based** - Polls for pending requests every 5 seconds (configurable via REQUEST_PROCESSOR_INTERVAL_MS)
- **WebSocket separate from HTTP** - WS on port 3001, HTTP on port 3000
- **Client workspaces** - `agent`, `api-client`, `fs-utils`, `rag`, `script-runner` are separate npm packages under `a2a-client/packages/`
