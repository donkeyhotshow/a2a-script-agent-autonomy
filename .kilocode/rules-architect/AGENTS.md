# Project Architecture Rules (Non-Obvious Only)

- **WebSocket separate from HTTP** - WS on port 3001, HTTP on port 3000
- **Client workspaces** - `agent`, `api-client`, `fs-utils`, `rag`, `script-runner` are separate npm packages under `a2a-client/packages/`
- **Actions support batch processing** - New actions can use context-based state machine for iterative batch execution (see [`plans/fix-vue-imports-batch.md`](plans/fix-vue-imports-batch.md))
- **Request processor is timer-based** - Polls for pending requests every 5 seconds (configurable via REQUEST_PROCESSOR_INTERVAL_MS)
