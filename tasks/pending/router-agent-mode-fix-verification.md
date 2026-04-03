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
| `isTaskRequest` unit tests | PASS | `a2a-server/tests/unit/base-processor-is-task-request.test.ts` — `step: new` → task path; `agent` + `step !== new` → not task |
| `execution.action` preservation | PASS | Code path: `action-request-processor` direct LLM pipeline when not `isTaskRequest` |
| Router form suppression | PASS | No router re-entry after pipeline step advances past `new` |
| `gray-room-test.js` | NOT RUN | Client API `:5173` unreachable in this run (`fetch failed`); needs `start-all` + healthy LLM |
| Gray Room slot / Red Room e2e | BLOCKED | Same as below when LLM returns 401/429 |

## Blocker
**External AI provider issues:**
- `401 Unauthorized` - Authentication parameter not received in Header
- `429 Rate Limit` - Rate limit reached for requests

These errors prevent LLM responses, causing `execute: null` and `message: "LLM recovery failed"`.

## Next Steps
1. Start full stack (`start-all.bat`) so `CLIENT_API_URL` (5173) answers
2. Resolve AI provider authentication/rate limiting if not using local Ollama
3. Re-run `node tests/direct-tests/gray-room-test.js`
4. Verify Gray Room slot in `context.workbench.slots.grayRoom` and Red Room tool cycle

## Commands to Verify
```powershell
$env:CLIENT_API_URL='http://127.0.0.1:5173'
node tests/direct-tests/gray-room-test.js
```

## Files Modified
- `a2a-server/src/services/core/request-processor/base-processor.ts`
- `a2a-server/src/services/core/request-processor/action-request-processor.ts`
