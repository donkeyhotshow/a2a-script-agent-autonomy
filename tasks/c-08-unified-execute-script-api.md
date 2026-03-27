# C-08: Unified Execute Script API (Task-04)

## Problem
TODO(Task-04) in `packages/execution/src/script-runner/index.ts` needs closure - unify `execute.script` API and `result["script"]` shape.

## Solution
1. Define canonical `execute.script` shape:
```json
{
  "execute": {
    "script": {
      "code": "...",
      "language": "javascript",
      "sandbox": "vm2" | "isolated-vm"
    }
  }
}
```

2. Define canonical `result["script"]` shape:
```json
{
  "result": {
    "script": {
      "output": "...",
      "exitCode": 0,
      "error": null
    }
  }
}
```

3. Update all script-runner code to use these shapes

## Where
- File: `a2a-client/packages/execution/src/script-runner/index.ts`
- Related: `a2a-client/packages/sdk/src/server/server/routes/sessions.ts`

## Verification
```bash
cd a2a-client && npm test -- --grep "script-runner"
```
