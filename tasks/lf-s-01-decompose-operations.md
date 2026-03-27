# LF-S-01: Decompose transform/operations.ts

## Problem
`src/transform/operations.ts` is ~897 lines - needs decomposition.

## Solution
Split into modules:
- `operations/json-path.ts` - JSON path helpers
- `operations/value-helpers.ts` - Value manipulation utilities
- `operations/transform-groups.ts` - Grouped operation implementations

## Where
- File: `a2a-server/src/transform/operations.ts`
- Target: Create `a2a-server/src/transform/operations/` directory

## Verification
```bash
cd a2a-server && npm run test -- --grep operations
```
