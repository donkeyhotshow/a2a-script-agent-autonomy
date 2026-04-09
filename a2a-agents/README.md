# a2a-agents (@a2a/agents)

Unified A2A Agents: actions, orchestrators, skills extracted from a2a-server/src.

## Purpose
Shared TypeScript modules for agent orchestration, central runbook (e.g., `src/runbook/central-orchestrator.mjs`), and skills used across the monorepo.

- Exports: `./runbook/central-orchestrator`
- Main: `src/index.ts`
- Deps: zod, tsx, vitest
- Scripts: `npm run dev`, `npm test`

See root `docs/ARCHITECTURE.md` and `docs/CENTRAL-ORCHESTRATOR.md` for usage in full stack (run via root `npm run central`).
