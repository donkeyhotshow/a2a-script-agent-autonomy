# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Critical Rules (Non-Obvious Only)

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

### Running Tests
```bash
# Single test file
npx vitest run tests/unit/auth.controller.test.ts

# Single test by name
npx vitest run -t "test name"

# All simulations
npm run test:sim:all
```

## A2A Protocol (Critical)

### Action-Key Shape (Mandatory)
All result and execute objects MUST use action-type keys:
```typescript
// Correct:
{ result: { "read-file": { path: "...", content: "..." } } }
{ execute: { "script": { input: {}, output: "...", code: "..." } } }

// Incorrect:
{ result: { content: "..." } }
{ execute: { action: "read-file", file: "..." } }
```

### AI-Action Transform Pattern
LLM controls `context.execution.step`, server persists via transforms. Prompt format:
```json
{
  "step": "step_name",
  "message": "user-visible explanation",
  "execute": { "<one_action>": { ...params } },
  "completed": false
}
```

### Simulation Pipeline
```
request.json → server-transforms → request.md → [LLM] → response.md → server-transforms → response.json
```

### Request Flow Types (Critical)

**Sync Flow (For Testing/Simulations):**
- **When:** Simple operations, form interactions, choice selections
- **Response:** Immediate `execute` object with form/input data
- **Use Case:** UI interactions, simple actions, automated testing
- **Example:**
  - `task: "dialog"` → `execute.form.input` (прямой диалог)
  - `task: "analyze code"` → `execute.form.choices` (роутер)
- **Enable:** Set `DEFAULT_SYNC_MODE=1` in environment

**Async Flow (PromiseId - Default):**
- **When:** Complex AI processing, LLM calls, long-running operations
- **Response:** `promiseId` for polling status/result
- **Use Case:** AI generation, complex analysis, external API calls
- **Example:** LLM dialog processing → `promiseId` → poll for completion

**Flow Detection:**
- **Client Request:** Include `sync: true` for sync responses
- **Server Response:** `sync: true` + `execute` = sync, `promiseId` = async

### Context Fields (System-Managed - Do Not Modify Manually)
- `context.history` - Array of execution records
- `context.execution` - Current state: `{ action, step, progress }`
- `context.docVirtual` - Virtual document state for accumulating content

## Environment Variables
- `SKIP_AUTH=1` - Bypass authentication in development
- `ENCRYPTION_KEY` - Must be exactly 32 characters
- `JWT_SECRET` - Minimum 32 characters
- Ports: HTTP 3000, Client API 3001, Web UI 5173
