# LF-C-03: Decompose sessions.ts Route

## Problem
`packages/sdk/src/server/server/routes/sessions.ts` is ~1033 lines - needs decomposition.

## Solution
Split into:
- `routes/sessions-read.ts` - GET /sessions endpoints
- `routes/sessions-mutation.ts` - POST /sessions endpoints
- `routes/sessions-async.ts` - async/promise endpoints

## Where
- File: `a2a-client/packages/sdk/src/server/server/routes/sessions.ts`

## Verification
```bash
cd a2a-client && npm test -- --grep sessions
```
