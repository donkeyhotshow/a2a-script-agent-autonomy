# Proba-Servera Regression Report

**Generated:** 2026-04-06T21:15:25.147Z

## Summary

- **Total Cases:** 19
- **Passed:** 17
- **Failed:** 2

## Regressions Detected

### dialog-message

- **Status:** FAIL
- **Report:** [dialog-message/error-report.md](dialog-message/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.form.title` | missing-key | {"type":"string","keys":null} | — |
| `execute.form.description` | missing-key | {"type":"string","keys":null} | — |
| `execute.form.input` | missing-key | {"type":"array","itemTypes":[{"type":"ob | — |



### dialog-select

- **Status:** FAIL
- **Report:** [dialog-select/error-report.md](dialog-select/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.form.title` | missing-key | {"type":"string","keys":null} | — |
| `execute.form.description` | missing-key | {"type":"string","keys":null} | — |
| `execute.form.input` | missing-key | {"type":"array","itemTypes":[{"type":"ob | — |



## Schema Impact Analysis

### Common Patterns

When tests fail with 'missing-key' in \`execute\`:
1. Server stopped returning expected action key (form, message, etc.)
2. Server now returns empty \`execute: {}\` — usually means async processing failed
3. Client should detect this and handle via promise polling, not \`execute.wait\`

### Action Items

- Check server transforms for the failing action
- Verify LLM pipeline availability (Gray Room fallbacks)
- Update expected.json if server behavior changed intentionally
- If server now returns \`promiseId\` instead of sync response — test is async, needs different fixture

## Test Case Index

| Case | Status | Description |
|------|--------|-------------|
| agent-select | ✅ PASS | Router choice → agent mode init |
| agent-tool-call | ✅ PASS | Agent mode → tool execution request |
| agent-tool-edit-patch | ✅ PASS | Server request/response validation |
| agent-tool-execute-command | ✅ PASS | Server request/response validation |
| agent-tool-file-exists | ✅ PASS | Server request/response validation |
| agent-tool-grep-search | ✅ PASS | Server request/response validation |
| agent-tool-list-directory | ✅ PASS | Server request/response validation |
| agent-tool-rag-search | ✅ PASS | Server request/response validation |
| agent-tool-read-file | ✅ PASS | Server request/response validation |
| agent-tool-run-script | ✅ PASS | Server request/response validation |
| agent-tool-write-file | ✅ PASS | Server request/response validation |
| agent-workspace-chain | ✅ PASS | Server request/response validation |
| dialog-follow-up | ✅ PASS | Server request/response validation |
| dialog-interrupt | ✅ PASS | Server request/response validation |
| dialog-message | ❌ FAIL | Dialog mode → user message |
| dialog-message-only | ✅ PASS | Server request/response validation |
| dialog-select | ❌ FAIL | Router choice → dialog mode init |
| router-new-task | ✅ PASS | Initial task → router with choices |
| script-select | ✅ PASS | Router choice → scripted action pipeline |
