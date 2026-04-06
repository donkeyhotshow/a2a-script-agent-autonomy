# Proba-Servera Regression Report

**Generated:** 2026-04-06T09:44:46.781Z

## Summary

- **Total Cases:** 19
- **Passed:** 1
- **Failed:** 18

## Regressions Detected

### agent-select

- **Status:** FAIL
- **Report:** [agent-select/error-report.md](agent-select/error-report.md)

### agent-tool-call

- **Status:** FAIL
- **Report:** [agent-tool-call/error-report.md](agent-tool-call/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.form` | missing-key | {"type":"object","keys":{"title":{"type" | — |



### agent-tool-edit-patch

- **Status:** FAIL
- **Report:** [agent-tool-edit-patch/error-report.md](agent-tool-edit-patch/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.write-file` | missing-key | {"type":"object","keys":{"path":{"type": | — |



### agent-tool-execute-command

- **Status:** FAIL
- **Report:** [agent-tool-execute-command/error-report.md](agent-tool-execute-command/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.run-script` | missing-key | {"type":"object","keys":{"scriptId":{"ty | — |



### agent-tool-file-exists

- **Status:** FAIL
- **Report:** [agent-tool-file-exists/error-report.md](agent-tool-file-exists/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.edit-patch` | missing-key | {"type":"object","keys":{"path":{"type": | — |



### agent-tool-grep-search

- **Status:** FAIL
- **Report:** [agent-tool-grep-search/error-report.md](agent-tool-grep-search/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"file-exists":{ | — |



### agent-tool-list-directory

- **Status:** FAIL
- **Report:** [agent-tool-list-directory/error-report.md](agent-tool-list-directory/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.read-file` | missing-key | {"type":"object","keys":{"path":{"type": | — |



### agent-tool-rag-search

- **Status:** FAIL
- **Report:** [agent-tool-rag-search/error-report.md](agent-tool-rag-search/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|



### agent-tool-read-file

- **Status:** FAIL
- **Report:** [agent-tool-read-file/error-report.md](agent-tool-read-file/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute` | missing-key | {"type":"object","keys":{"grep-search":{ | — |



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
| `execute.execute-command` | missing-key | {"type":"object","keys":{"command":{"typ | — |



### agent-workspace-chain

- **Status:** FAIL
- **Report:** [agent-workspace-chain/error-report.md](agent-workspace-chain/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.file-exists` | missing-key | {"type":"object","keys":{"path":{"type": | — |



### dialog-follow-up

- **Status:** FAIL
- **Report:** [dialog-follow-up/error-report.md](dialog-follow-up/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `outcome` | missing-key | {"type":"string","keys":null} | — |
| `error` | missing-key | {"type":"string","keys":null} | — |



### dialog-interrupt

- **Status:** FAIL
- **Report:** [dialog-interrupt/error-report.md](dialog-interrupt/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `outcome` | missing-key | {"type":"string","keys":null} | — |
| `error` | missing-key | {"type":"string","keys":null} | — |



### dialog-message

- **Status:** FAIL
- **Report:** [dialog-message/error-report.md](dialog-message/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `context.workbench.sections` | missing-key | {"type":"object","keys":{}} | — |
| `execute.form.title` | missing-key | {"type":"string","keys":null} | — |
| `execute.form.description` | missing-key | {"type":"string","keys":null} | — |
| `execute.form.input` | missing-key | {"type":"array","itemTypes":[{"type":"ob | — |



### dialog-message-only

- **Status:** FAIL
- **Report:** [dialog-message-only/error-report.md](dialog-message-only/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `outcome` | missing-key | {"type":"string","keys":null} | — |
| `error` | missing-key | {"type":"string","keys":null} | — |



### dialog-select

- **Status:** FAIL
- **Report:** [dialog-select/error-report.md](dialog-select/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `context.workbench.sections` | missing-key | {"type":"object","keys":{}} | — |
| `execute.form.title` | missing-key | {"type":"string","keys":null} | — |
| `execute.form.description` | missing-key | {"type":"string","keys":null} | — |
| `execute.form.input` | missing-key | {"type":"array","itemTypes":[{"type":"ob | — |



### router-new-task

- **Status:** FAIL
- **Report:** [router-new-task/error-report.md](router-new-task/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|



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
| agent-select | ❌ FAIL | Router choice → agent mode init |
| agent-tool-call | ❌ FAIL | Agent mode → tool execution request |
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
| dialog-follow-up | ❌ FAIL | Server request/response validation |
| dialog-interrupt | ❌ FAIL | Server request/response validation |
| dialog-message | ❌ FAIL | Dialog mode → user message |
| dialog-message-only | ❌ FAIL | Server request/response validation |
| dialog-select | ❌ FAIL | Router choice → dialog mode init |
| router-new-task | ❌ FAIL | Initial task → router with choices |
| script-select | ✅ PASS | Router choice → scripted action pipeline |
