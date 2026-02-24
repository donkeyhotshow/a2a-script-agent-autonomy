# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Project-Specific Information

### Configuration
- **JWT_SECRET requires 32+ characters** - Enforced by Zod validation
- **All config via environment variables** - Uses Zod schema validation with sensible defaults

### Import Patterns
- **Use .js extension for path aliases** - Due to NodeNext module resolution, imports like `import x from '@/services/x'` must use `.js` extension

### Commands
```bash
# a2a-server
cd a2a-server && npm run dev
cd a2a-server && npm run dev:no-auth
cd a2a-server && npm test
cd a2a-server && npm run lint
```
