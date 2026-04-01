# S9 — Substeps `N-sub-M` in sim-validate / sim-lint

**Status:** done  
**Tracked in:** [`work/STATE.md`](../work/STATE.md) (row S9)

## Problem

`sim-validate --all` used to **skip** `N-sub-M/` folders unless `--include-substeps` was passed, so interrupt-loop goldens were easy to miss in CI. `sim-lint` already walks substeps when linting a parent scenario directory (`sim-lint/runners.ts`).

## Resolution

- **`sim-validate`:** `getAllSimulations()` now **includes** substeps by default. Use **`--skip-substeps`** to exclude them.
- **Docs:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md), [`simulations/SERVER-CONTRACT.md`](../simulations/SERVER-CONTRACT.md).
- **Fixtures:** `agent-auto-ai` substeps that lacked a top-level `execute` (or `response.json`) were completed so `--all` stays green.

## Verify

```bash
cd a2a-server && npm run sim:validate -- --all --json
cd a2a-server && npm run sim:quality
```
