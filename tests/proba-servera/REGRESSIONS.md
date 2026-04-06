# Proba-Servera Regression Report

**Generated:** 2026-04-06T19:35:17.579Z

## Summary

- **Total Cases:** 1
- **Passed:** 0
- **Failed:** 1

## Regressions Detected

### agent-tool-edit-patch

- **Status:** FAIL
- **Report:** [agent-tool-edit-patch/error-report.md](agent-tool-edit-patch/error-report.md)

**Differences:**

## Differences

| Path | Issue | Expected | Actual |
|------|-------|----------|--------|
| `execute.edit-patch` | missing-key | {"type":"object","keys":{"path":{"type": | — |



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
| agent-tool-edit-patch | ❌ FAIL | Server request/response validation |
