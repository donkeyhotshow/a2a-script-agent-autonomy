# Human-review test run (a2a-server)

**When:** 2026-04-05T22:50:12.503Z
**Exit code:** 1

## Summary

Passed: 0, Failed: 2, Vitest exit: 1

### FAIL: C:/workspace/org-carrier/a2a-script-agent/a2a-server/tests/human-review/invoke-shape-null-context.test.ts › does not pass through context: null as the nested envelope

```
AssertionError: expected null not to be null
    at C:\workspace\org-carrier\a2a-script-agent\a2a-server\tests\human-review\invoke-shape-null-context.test.ts:13:33
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:146:14
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:533:11
    at runWithTimeout (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:39:7)
    at runTest (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1056:17)
    at processTicksAndRejections (node:internal/process/task_queues:103:5)
    at runSuite (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1205:15)
    at runSuite (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1205:15)
    at runFiles (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1262:5)
    at startTests (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1271:3)
```

### FAIL: C:/workspace/org-carrier/a2a-script-agent/a2a-server/tests/human-review/merge-inner-history-invariant.test.ts › rejects non-array history from handler context (keep array invariant)

```
AssertionError: expected false to be true // Object.is equality
    at C:\workspace\org-carrier\a2a-script-agent\a2a-server\tests\human-review\merge-inner-history-invariant.test.ts:17:45
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:146:14
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:533:11
    at runWithTimeout (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:39:7)
    at runTest (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1056:17)
    at processTicksAndRejections (node:internal/process/task_queues:103:5)
    at runSuite (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1205:15)
    at runSuite (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1205:15)
    at runFiles (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1262:5)
    at startTests (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-server/node_modules/@vitest/runner/dist/index.js:1271:3)
```


## Console

```text
JSON report written to C:/workspace/org-carrier/a2a-script-agent/a2a-server/tests/human-review/.last-vitest.json


```

## Your confirmation (edit below)

- [ ] I reviewed failures above — real bugs vs wrong expectations
- [ ] Notes:

