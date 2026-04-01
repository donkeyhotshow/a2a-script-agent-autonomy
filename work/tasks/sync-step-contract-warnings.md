# Sync simulations: step-contract warning debt

**Status:** Resolved — added passthrough `server-transforms-request.json` on no-LLM steps; removed orphan `server-transforms-response.json` where there was no `response.md` (2026-04-01).

## Problem

With strict pipeline rules enabled, **all 47** current `sim:validate --step-contract` warnings live under `simulations/sync/` (none under `simulations/async/` at last run).

Run (from repo root):

```bash
cd a2a-server && npx tsx scripts/sim-validate.ts --all --json --step-contract
```

Two recurring messages (see `a2a-server/scripts/sim-contract/step-transform-rules.ts`):

1. **Missing `server-transforms-request.json`** — step has no `request.md` / no LLM, but SCHEMA expects an explicit no-LLM request transform file for the step.
2. **Unexpected `server-transforms-response.json` without `response.md`** — post-LLM transform file present when there is no LLM step; SCHEMA says omit it.

## Affected step IDs (sync only)

`sync/agent/1`  
`sync/agent-analyze/2`, `sync/agent-analyze/5`, `sync/agent-analyze/8`  
`sync/agent-coder/2`  
`sync/agent-coder-smart/2`  
`sync/agent-workspace-tools/1`–`4`  
`sync/fix-laravel-namespaces-and-uses/2`–`6`  
`sync/fix-vue-imports/2`  
`sync/fix-vue-imports-batched/1`–`8`  
`sync/fix-vue-imports-decline/2`  
`sync/invoke-form-confirmation/1`  
`sync/invoke-simulation-record/1`  
`sync/orchestrator-dialog/1`–`4`  
`sync/phpunit-deprecations/1`–`5`  
`sync/resilience-contract/1`–`6`  
`sync/task-decomposition/1`, `2`, `3`, `7`, `9`

## Done when

- [ ] `contractComplete: true` (warning count 0) for `sim:validate -- --all --step-contract`, **or** team decision recorded to narrow/retire the rule if these goldens are intentionally partial.
- [ ] After edits: `npm run sim:lint -- --all` and `npm run sim:validate -- --all` from repo root.
