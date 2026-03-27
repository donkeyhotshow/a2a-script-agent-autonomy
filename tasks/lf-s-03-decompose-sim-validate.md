# LF-S-03: Decompose sim-validate.ts

## Problem
`scripts/sim-validate.ts` is ~810 lines.

## Solution
Split into:
- `scripts/sim-validate/scanner.ts` - Simulation discovery
- `scripts/sim-validate/validators.ts` - Validation rules
- `scripts/sim-validate/reporters.ts` - Report formatters

## Where
- File: `a2a-server/scripts/sim-validate.ts`

## Verification
```bash
cd a2a-server && npm run sim:validate -- --help
```
