# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Only

### Imports with Path Aliases
Use `.js` extension for imports with path aliases due to NodeNext module resolution:
```typescript
// Wrong: import x from '@/services/x'
// Correct:
import x from '@/services/x.js'
```
([`tsconfig.json`](a2a-server/tsconfig.json:4-5))

### Testing Requirements
- **ENCRYPTION_KEY** - Must be exactly 32 characters in tests ([`tests/setup.ts`](a2a-server/tests/setup.ts:16))
- **Test database** - Uses `a2a_test`, not `a2a_server` ([`tests/setup.ts`](a2a-server/tests/setup.ts:13))

### Architecture
- **Ports**: HTTP server on 3000, client API on 3001, web UI on 5173
- **Request processor**: Timer-based polling every 5 seconds (configurable via REQUEST_PROCESSOR_INTERVAL_MS)
- **Client workspaces**: Separate npm packages under `a2a-client/packages/`: agent, api-client, fs-utils, rag, script-runner, terminal, types
- **Actions**: Support batch processing via context-based state machine

### Environment Variables
- `SKIP_AUTH=1` - Bypass authentication in development
- `ENCRYPTION_KEY` - Must be exactly 32 characters
- `JWT_SECRET` - Minimum 32 characters
