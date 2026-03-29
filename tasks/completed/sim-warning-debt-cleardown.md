# Task: Simulation Warning Debt Cleardown

## Context

**Discovered in Cycle 2 (2026-03-29) during prune → discover → write:**

Running `npm run sim:validate -- --all --json` shows:
- `warningCount`: 380 total warnings
- `contractComplete`: false (due to warnings)
- `structuralValid`: true

Most warnings fall into two categories:
1. **"Optional file not found"**: `server-transforms-request.json`, `server-transforms-response.json` 
2. **"AJV schema check skipped (lenient)"**: Transform schema validation skipped

## Risk (EH-05)

From [`DEV_STATE.md`](../../../DEV_STATE.md) line 66-67:
> **EH-05**: "Valid but not clean" sims without roadmap - Track `sim:validate` warning *Optional file not found* (and similar): document in SCHEMA + root/module state until **clean** or explicit waiver with owner.

## What to Do

1. **Analyze** - Map the 380 warnings by simulation folder and warning type
2. **Prioritize** - Identify high-impact clusters (e.g., which simulations have most warnings)
3. **Fix or Waive** - For each cluster:
   - If fixable: add missing optional files OR add schema validation
   - If blockers exist: document waiver with owner and target date
4. **Verify** - Run `npm run sim:validate -- --all --json` until `contractComplete: true`

## Verification

```bash
cd a2a-server && npm run sim:validate -- --all --json
# Expected: contractComplete: true (warningCount: 0)
```

## References

- [`simulations/SCHEMA.md`](../../../simulations/SCHEMA.md)
- [`DEV_STATE.md`](../../../DEV_STATE.md) - EH-05 risk tracking
- [`AGENTS.md`](../../../AGENTS.md) - Testing section