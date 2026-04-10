# Project Architecture Rules (Non-Obvious Only)

- **Client workspaces** - `api-client`, `fs-utils`, `rag`, `script-runner` are separate npm packages under `a2a-client/packages/`
- **Actions support batch processing** - New actions can use context-based state machine for iterative batch execution
- **Request processor is timer-based** - Polls for pending requests every 5 seconds (configurable via REQUEST_PROCESSOR_INTERVAL_MS)
