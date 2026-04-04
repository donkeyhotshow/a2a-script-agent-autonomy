# ADR-0082: Sub-Agent Verification

## Status
Approved

## Context
Complex migrations often fail because sub-tasks are not verified before proceeding.

## Decision
Enforce a "Truly Done" check for every sub-agent task:
1. Tests must pass.
2. Git state must be clean (no unexpected diffs).
3. Logs must be free of regression errors.

## Consequences
- Higher reliability in multi-step workflows.
- Automatic rollbacks if verification fails.
