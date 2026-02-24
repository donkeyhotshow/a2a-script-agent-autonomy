# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Project-Specific Information

### Configuration
- **JWT_SECRET requires 32+ characters** - Enforced by Zod validation in [`config/index.ts`](a2a-server/src/config/index.ts:19)
- **ENCRYPTION_KEY required for tests** - Must be exactly 32 characters, set in [`tests/setup.ts`](a2a-server/tests/setup.ts:16)
- **All config via environment variables** - Uses Zod schema validation with defaults in [`config/index.ts`](a2a-server/src/config/index.ts:9-63)

### Import Patterns
- **Use .js extension for path aliases** - Due to NodeNext module resolution in [`tsconfig.json`](a2a-server/tsconfig.json:4-5), imports like `import x from '@/services/x'` must use `.js` extension: `import x from '@/services/x.js'`

### Commands
```bash
# a2a-server
cd a2a-server && npm run dev:no-auth      # Development without auth (SKIP_AUTH=1)
cd a2a-server && npx vitest run tests/unit/auth.controller.test.ts  # Run single test file
cd a2a-server && npx vitest run -t "test name"  # Run tests by name pattern

# a2a-client
cd a2a-client && npm run test:e2e         # E2E tests with Playwright
```

### Architecture Notes
- **Server does NOT store client data** - Graph is passed in context and returned in response; stateless design
- **PhaseMachine drives request flow** - State machine with phases: idle → discovery → recognition → analysis → action → validation → completed
- **ActionProcessor for no-AI mode** - Executes actions from MD definition files without AI calls
- **Request processor is timer-based** - Polls for pending requests every 5 seconds (configurable via REQUEST_PROCESSOR_INTERVAL_MS)
- **WebSocket separate from HTTP** - WS on port 3001, HTTP on port 3000
- **Client workspaces** - `agent`, `api-client`, `fs-utils`, `rag`, `script-runner` are separate npm packages under `a2a-client/packages/`
