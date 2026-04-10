---
name: debug
description: Systematic debugging approach for finding and fixing bugs
---

# Debug Skill

## When to use

Use when the user reports an error, exception, crash, unexpected behavior, or asks to "fix a bug".

## Workflow

1. **Reproduce** — Identify the exact trigger: what input, what state, what sequence of steps causes the issue.
2. **Locate** — Trace the error to its root cause. Read error messages carefully. Find the exact file and line.
3. **Hypothesize** — Form a hypothesis. What is the code assuming that isn't true?
4. **Verify hypothesis** — Check the code path, data flow, or state to confirm your hypothesis before writing a fix.
5. **Fix root cause** — Fix the underlying issue, not just the symptom. Avoid `try/catch` that swallows errors.
6. **Test** — Run relevant tests. Add a regression test if one doesn't exist.

## Key principles

- **Never guess** — always read the error message completely before acting
- **One change at a time** — make one fix, verify it, then move to the next
- **Avoid masking** — don't add `|| undefined`, `?.`, or `try/catch` unless you understand why the value is missing
- **Log context** — when debugging async issues, log the full context object, not just the error message
- **Check imports** — many bugs in TypeScript/Node.js are caused by import path issues (missing `.js` extension)

## Common bug patterns in this codebase

- Missing `.js` extension on relative imports (NodeNext module resolution)
- `undefined` context fields accessed without null-check
- Async functions called without `await`
- Incorrect action-key shape in `execute` or `result` objects
