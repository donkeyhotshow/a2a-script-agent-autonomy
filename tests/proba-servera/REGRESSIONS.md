# Proba-Servera Regression Report

**Generated:** 2026-04-05T19:41:36.732Z

## Summary

- **Total Cases:** 19
- **Passed:** 9
- **Failed:** 10

## Regressions Detected

### agent-tool-edit-patch

- **Status:** FAIL
- **Report:** [agent-tool-edit-patch/error-report.md](agent-tool-edit-patch/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



### agent-tool-execute-command

- **Status:** FAIL
- **Report:** [agent-tool-execute-command/error-report.md](agent-tool-execute-command/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



### agent-tool-file-exists

- **Status:** FAIL
- **Report:** [agent-tool-file-exists/error-report.md](agent-tool-file-exists/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



### agent-tool-grep-search

- **Status:** FAIL
- **Report:** [agent-tool-grep-search/error-report.md](agent-tool-grep-search/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



### agent-tool-list-directory

- **Status:** FAIL
- **Report:** [agent-tool-list-directory/error-report.md](agent-tool-list-directory/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



### agent-tool-rag-search

- **Status:** FAIL
- **Report:** [agent-tool-rag-search/error-report.md](agent-tool-rag-search/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



### agent-tool-read-file

- **Status:** FAIL
- **Report:** [agent-tool-read-file/error-report.md](agent-tool-read-file/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



### agent-tool-run-script

- **Status:** FAIL
- **Report:** [agent-tool-run-script/error-report.md](agent-tool-run-script/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



### agent-tool-write-file

- **Status:** FAIL
- **Report:** [agent-tool-write-file/error-report.md](agent-tool-write-file/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



### agent-workspace-chain

- **Status:** FAIL
- **Report:** [agent-workspace-chain/error-report.md](agent-workspace-chain/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"form":{"type": | — |



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
| agent-tool-edit-patch | ❌ FAIL | Server request/response validation |
| agent-tool-execute-command | ❌ FAIL | Server request/response validation |
| agent-tool-file-exists | ❌ FAIL | Server request/response validation |
| agent-tool-grep-search | ❌ FAIL | Server request/response validation |
| agent-tool-list-directory | ❌ FAIL | Server request/response validation |
| agent-tool-rag-search | ❌ FAIL | Server request/response validation |
| agent-tool-read-file | ❌ FAIL | Server request/response validation |
| agent-tool-run-script | ❌ FAIL | Server request/response validation |
| agent-tool-write-file | ❌ FAIL | Server request/response validation |
| agent-workspace-chain | ❌ FAIL | Server request/response validation |
| dialog-follow-up | ✅ PASS | Server request/response validation |
| dialog-interrupt | ✅ PASS | Server request/response validation |
| dialog-message | ✅ PASS | Dialog mode → user message |
| dialog-message-only | ✅ PASS | Server request/response validation |
| dialog-select | ✅ PASS | Router choice → dialog mode init |
| router-new-task | ✅ PASS | Initial task → router with choices |
| script-select | ✅ PASS | Router choice → scripted action pipeline |
