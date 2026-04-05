# Human-review test run (a2a-client)

**When:** 2026-04-05T22:49:52.463Z
**Exit code:** 1

## Summary

Passed: 0, Failed: 2, Vitest exit: 1

### FAIL: C:/workspace/org-carrier/a2a-script-agent/a2a-client/tests/human-review/next-response-top-execute.test.mjs › does not surface raw tool execute when session carries a safe projected execute

```
AssertionError: expected [ 'read-file' ] to not include 'read-file'
    at Proxy.<anonymous> (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/expect/dist/index.js:1252:15)
    at Proxy.<anonymous> (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/expect/dist/index.js:1090:14)
    at Proxy.methodWrapper (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/chai/index.js:1700:25)
    at C:/workspace/org-carrier/a2a-script-agent/a2a-client/tests/human-review/next-response-top-execute.test.mjs:20:22
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:145:11
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:915:26
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:1243:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:1209:10)
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:1653:37
```

### FAIL: C:/workspace/org-carrier/a2a-script-agent/a2a-client/tests/human-review/stage-processing-status.test.mjs › maps status processing to awaiting-async when async is still logically in flight

```
AssertionError: expected 'dialog-input' to be 'awaiting-async' // Object.is equality
    at C:/workspace/org-carrier/a2a-script-agent/a2a-client/tests/human-review/stage-processing-status.test.mjs:16:7
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:145:11
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:915:26
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:1243:20
    at new Promise (<anonymous>)
    at runWithTimeout (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:1209:10)
    at file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:1653:37
    at Traces.$ (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/vitest/dist/chunks/traces.CCmnQaNT.js:142:27)
    at trace (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/vitest/dist/chunks/test.B8ej_ZHS.js:239:21)
    at runTest (file:///C:/workspace/org-carrier/a2a-script-agent/a2a-client/node_modules/@vitest/runner/dist/index.js:1653:12)
```


## Console

```text
JSON report written to C:/workspace/org-carrier/a2a-script-agent/a2a-client/tests/human-review/.last-vitest.json


```

## Your confirmation (edit below)

- [ ] I reviewed failures above — real bugs vs wrong expectations
- [ ] Notes:

