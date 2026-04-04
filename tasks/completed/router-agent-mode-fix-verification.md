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
| `isTaskRequest` unit tests | PASS | `a2a-server/tests/unit/base-processor-is-task-request.test.ts` |
| `determineRequestType` router + pipeline choice | PASS | `a2a-server/tests/router-dialog-routing.test.ts` — routes to **action** so `handleRouterChoice` runs before dialog |
| Sticky router e2e | PASS | `node tests/direct-tests/e2e-dialog-test.js --only=routerAgentNoLoop,routerAgentNoLoopTaskShorthand,routerAgentNoLoopUtf8Task,routerDialogNoLoop,routerDialogNoLoopTaskShorthand,routerWrongBeatMessage` with `CLIENT_API_URL=http://127.0.0.1:5173` |
| `gray-room-test.js` | FAIL (env) | Async did not settle within timeout (~3m); AI proxy / LLM path still flaky in this environment — not a router regression |

## Follow-up fix (2026-04-03)

Pipeline router beat B was routed straight to **dialog** while `applyRouterTransformSchemaHint` set `transformSchema`, so **`handleRouterChoice` never ran** and LLM failures returned **no `context`**, leaving **`execution.action: task` / `step: router`** on the client.

Changes: `request-processor.service.ts` — `exec.step === 'router'` + LLM pipeline `choice` → **`action`** first; `request.service.ts` — merge `result.context` into stored request on **`failed`** as well as **`completed`**; `dialog-request-processor.ts` — failed outcomes include **normalized `context`** for sync responses.

## Next Steps (optional)
1. When AI hub + Ollama are healthy, re-run `node tests/direct-tests/gray-room-test.js` (full Gray/Red room chain).
2. Fix `start-all.bat` / ai-integration startup if AI proxy stays unreachable (`Невозможно соединиться с удаленным сервером`).

## Commands to Verify
```powershell
$env:CLIENT_API_URL='http://127.0.0.1:5173'
node tests/direct-tests/gray-room-test.js
```

## Files Modified
- `a2a-server/src/services/core/request-processor/base-processor.ts`
- `a2a-server/src/services/core/request-processor/action-request-processor.ts`
