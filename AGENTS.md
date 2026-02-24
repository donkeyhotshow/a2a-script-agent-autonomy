# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Project-Specific Information

### Configuration
- **JWT_SECRET requires 32+ characters** - Enforced by Zod validation in [`config/index.ts`](a2a-server/src/config/index.ts:23)
- **ENCRYPTION_KEY required for tests** - Must be 32 characters, set in [`tests/setup.ts`](a2a-server/tests/setup.ts:16)
- **All config via environment variables** - Uses Zod schema validation with sensible defaults

### Import Patterns
- **Use .js extension for path aliases** - Due to NodeNext module resolution, imports like `import x from '@/services/x'` must use `.js` extension: `import x from '@/services/x.js'`

### Commands
```bash
# a2a-server
cd a2a-server && npm run dev              # Development with auth
cd a2a-server && npm run dev:no-auth      # Development without auth (SKIP_AUTH=1)
cd a2a-server && npm test                 # Run all tests
cd a2a-server && npx vitest run tests/unit/auth.controller.test.ts  # Run single test file
cd a2a-server && npx vitest run -t "test name"  # Run tests by name pattern
cd a2a-server && npm run lint             # Lint check

# Database (a2a-server)
cd a2a-server && npm run prisma:generate  # Generate Prisma client
cd a2a-server && npm run prisma:migrate   # Run migrations
cd a2a-server && npm run init-db          # Initialize databases (creates a2a_server, a2a_test)

# a2a-client
cd a2a-client && npm test                 # Unit tests
cd a2a-client && npm run test:e2e         # E2E tests with Playwright
```

### Architecture Notes
- **Server does NOT store client data** - Graph is passed in context and returned in response (see [`request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts:5-7))
- **PhaseMachine drives request flow** - Phases: idle → discovery → recognition → analysis → action → validation → completed
- **ActionProcessor for no-AI mode** - Executes actions from MD definition files without AI calls
