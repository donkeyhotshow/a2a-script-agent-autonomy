# Sync: step-contract debt (regression guard)

## Sources

- [`tasks/sync-step-contract-warnings.md`](../tasks/sync-step-contract-warnings.md)
- [`a2a-server/scripts/sim-contract/step-transform-rules.ts`](../a2a-server/scripts/sim-contract/step-transform-rules.ts)
- [`package.json`](../package.json) / `a2a-server/package.json` — `sim:validate`, `sim:contract-report`

## Agent prompt (copy)

Keep `sim:validate -- --all --step-contract` clean (or document intentional exceptions). If new sync steps appear, add passthrough `server-transforms-request.json` / remove orphan response transforms per `SCHEMA.md`. Run contract report from root per `AGENTS.md`.

## Completion

- [x] Done (step-contract report clean across all sync simulations as of 2026-04-02)
