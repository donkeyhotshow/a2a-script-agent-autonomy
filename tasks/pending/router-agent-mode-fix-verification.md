# Router Agent Mode Fix - Verification Pending

## Problem
Session created with `mode: "agent"` was being forced through the task router, changing `execution.action` from `"agent"` to `"task"` and `step` to `"router"`.

## Fix Applied

### 1. `a2a-server/src/services/core/request-processor/base-processor.ts`
- Modified `isTaskRequest()` to check if `execution.action` is already an LLM pipeline action
- If `execution.action` is `"agent"`, `"dialog"`, or `"task-decomposition"`, returns `false` to prevent routing

### 2. `a2a-server/src/services/core/request-processor/action-request-processor.ts`
- Added direct LLM pipeline handling after `isTaskRequest()` check
- When `execution.action` is an LLM pipeline action, delegates to `dialogRequestProcessor` with proper `transformSchema`

## Verification Status

| Test | Status | Notes |
|------|--------|-------|
| `execution.action` preservation | PASS | Now stays `"agent"` across all steps |
| Router form suppression | PASS | No longer returns `form.choices` for agent mode |
| Gray Room slot creation | BLOCKED | External issue - see below |
| Full e2e dialog | BLOCKED | External issue - see below |

## Blocker
**External AI provider issues:**
- `401 Unauthorized` - Authentication parameter not received in Header
- `429 Rate Limit` - Rate limit reached for requests

These errors prevent LLM responses, causing `execute: null` and `message: "LLM recovery failed"`.

## Next Steps
1. Resolve AI provider authentication/rate limiting
2. Re-run `node tests/direct-tests/gray-room-test.js`
3. Verify Gray Room slot created in `context.workbench.slots.grayRoom`
4. Verify Red Room tool execution cycle works

## Commands to Verify
```powershell
$env:CLIENT_API_URL='http://127.0.0.1:5173'
node tests/direct-tests/gray-room-test.js
```

## Files Modified
- `a2a-server/src/services/core/request-processor/base-processor.ts`
- `a2a-server/src/services/core/request-processor/action-request-processor.ts`
