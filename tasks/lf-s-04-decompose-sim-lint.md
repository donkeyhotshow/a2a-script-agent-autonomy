# LF-S-04: Decompose sim-lint.ts

## Problem
`scripts/sim-lint.ts` is ~718 lines.

## Solution
Split into:
- `scripts/sim-lint/registry.ts` - Lint rule registry
- `scripts/sim-lint/runners.ts` - Rule runners
- `scripts/sim-lint/reporters.ts` - Reporters

## Where
- File: `a2a-server/scripts/sim-lint.ts`

## Verification
```bash
cd a2a-server && npm run sim:lint -- --help
```
