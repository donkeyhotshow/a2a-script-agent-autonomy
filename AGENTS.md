# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Structure
- **a2a-server** - TypeScript backend (Express, Prisma, PostgreSQL, Redis)
- **a2a-client** - JavaScript client with workspaces (Vue 3, Vite)

## Commands

### Root (monorepo)
```bash
npm run dev          # Start all services (web + 2 API servers)
npm run test         # Run client tests
npm run sim:run      # Run single simulation
npm run sim:run-all  # Run all simulations
```

### a2a-server
```bash
cd a2a-server
npm run dev          # Dev server (tsx watch)
npm run dev:no-auth  # Dev without auth (SKIP_AUTH=1)
npm run build        # tsc
npm run test         # vitest run
npm run lint         # eslint
npm run lint:fix     # eslint --fix
npm run format       # prettier --write
```

### a2a-client
```bash
cd a2a-client
npm run test         # vitest run
npm run test:watch   # vitest watch
npm run test:e2e     # playwright test
npm run test:e2e:ui  # playwright --ui
```

### Run Single Test (a2a-server)
```bash
npx vitest run tests/unit/auth.controller.test.ts
npx vitest run -t "test name"
```

## Code Style (Non-Obvious Only)

### Imports with Path Aliases
Use `.js` extension for imports with path aliases due to NodeNext module resolution:
```typescript
// Wrong: import x from '@/services/x'
// Correct:
import x from '@/services/x.js'
```

### TypeScript Strict Mode
Project uses strict TypeScript with these enabled:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

### Testing Requirements
- **ENCRYPTION_KEY** - Must be exactly 32 characters in tests ([`tests/setup.ts`](a2a-server/tests/setup.ts:16))
- **Test database** - Uses `a2a_test`, not `a2a_server` ([`tests/setup.ts`](a2a-server/tests/setup.ts:13))

## Architecture (Non-Obvious)

- **Ports**: HTTP server on 3000, client API on 3001, web UI on 5173
- **Request processor**: Timer-based polling every 5 seconds (configurable via REQUEST_PROCESSOR_INTERVAL_MS)
- **Client workspaces**: Separate npm packages under `a2a-client/packages/`: agent, api-client, fs-utils, rag, script-runner, terminal, types
- **Actions**: Support batch processing via context-based state machine

## Environment Variables
- `SKIP_AUTH=1` - Bypass authentication in development
- `NODE_ENV=development|production|test`
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing (min 32 chars)
- `ENCRYPTION_KEY` - Encryption key (exactly 32 chars)
