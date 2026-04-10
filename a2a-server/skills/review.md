---
name: review
description: Code review for bugs, security issues, quality, and architecture
---

# Review Skill

## When to use
Use when the user asks to review code, do a PR review, or check code quality.

## Workflow

1. **Understand intent** — What is this code trying to do? Read the task/PR description first.
2. **Check for bugs** — Look for null dereferences, off-by-one errors, race conditions, unhandled async.
3. **Check for security issues** — Look for hardcoded secrets, unvalidated inputs, unsafe `eval`, path traversal.
4. **Check architecture** — Does this fit the existing patterns? Are there circular dependencies?
5. **Check tests** — Are the new tests meaningful? Do they cover edge cases and failure paths?
6. **Check naming** — Are names clear and consistent with the codebase conventions?

## Review checklist

### Bugs / Correctness
- [ ] Are all async operations properly awaited?
- [ ] Are null/undefined values handled before use?
- [ ] Are error paths handled (not just the happy path)?
- [ ] Are there off-by-one errors in loops or array access?

### Security
- [ ] No hardcoded secrets, API keys, or passwords
- [ ] User inputs are validated before use
- [ ] No `eval()`, `new Function()`, or `vm.runInContext()` with untrusted data
- [ ] File paths are validated (no path traversal `../../etc/passwd`)

### Architecture
- [ ] Imports follow the codebase hierarchy (no wrong-direction dependencies)
- [ ] No global mutable state introduced without justification
- [ ] No logic duplication that should be in a shared utility

### This codebase specifics
- [ ] `.js` extension on all relative imports (NodeNext resolution)
- [ ] Action-key shape: one key per `execute` / `result` object
- [ ] No hardcoded `session_id` or `projectId` leaking to server

## Output format

Write a structured review with:
- **Summary**: 1-2 sentences on overall quality
- **Critical issues**: Must fix before merge
- **Suggestions**: Nice-to-have improvements
- **Verdict**: `APPROVE` / `REQUEST_CHANGES` / `NEEDS_DISCUSSION`
