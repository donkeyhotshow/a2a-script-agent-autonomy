# Development Conventions

## Naming

- Files: `kebab-case` (e.g. `gray-room-interrupt-handlers.ts`, `session-store.ts`)
- Classes: `PascalCase` (e.g. `RequestProcessor`, `GrayRoomManager`)
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for true constants; `camelCase` for config objects
- Test files: `*.test.ts` co-located with source or in `tests/unit/`

## Import style

- Extensions: `.js` **required** in all TypeScript imports (NodeNext moduleResolution)
  - ✅ `import { foo } from './foo.js'`
  - ❌ `import { foo } from './foo'`
- Order: external packages → workspace packages (`@a2a/*`, `@a2a-client/*`) → relative imports
- Aliases: none — use relative paths or workspace package names
- `.mjs` / `.mts` files: used for ESM-only scripts in `scripts/` and `tests/`

## TypeScript

- `strict: true` — all strict checks enabled in a2a-server
- `moduleResolution: NodeNext` — mandatory
- `noImplicitAny: true` — no implicit `any`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- Forbidden patterns: `// @ts-ignore`, `as any` (use proper types or `unknown`)
- Required: explicit return types on exported functions
- `useUnknownInCatchVariables: true` — catch variables are `unknown`, not `any`

## Error handling

- Every `catch` block **must** log the error — silent failures are bugs
- Use `winston` logger (from `@a2a/server-utils`) in server packages
- Never swallow errors without at minimum `logger.error(err)`
- Async errors must propagate or be explicitly handled — no fire-and-forget without error boundary

## File size limit

- Prefer files under ~300 lines; split into focused modules if larger
- One responsibility per file

## Comments

- JSDoc for exported public API functions and types
- Inline comments for non-obvious logic
- TODO format: `// TODO(scope): description` — always create a corresponding task in `tasks/`
- No commented-out dead code in committed files

## Action-key shape (MANDATORY)

Single action type per response — never mix:
```json
{ "execute": { "script": { ... } } }
// OR
{ "result": { "read-file": { ... } } }
```

## Async transport (MANDATORY)

- Stack is async end-to-end via promise queue
- Never add sync invoke paths or disable the promise queue
- Client API is the only entry point for session operations
