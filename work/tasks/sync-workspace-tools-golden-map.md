# S12 — `agent-workspace-tools` execute-key map

**Status:** partial  
**Tracked in:** [`work/STATE.md`](../work/STATE.md) (row S12)

## Goal

One place maps **every** `VALID_EXECUTE_KEYS` entry to **where** it is covered in sync goldens (not only the four steps under `agent-workspace-tools/`).

## Source of truth

- [`simulations/sync/agent-workspace-tools/description.md`](../simulations/sync/agent-workspace-tools/description.md) — expanded table + pointer to [`action-validator.ts`](../a2a-server/src/actions/action-validator.ts).

## Backlog

- When adding a new execute type, update **both** `VALID_EXECUTE_KEYS` and the description table.
- Add dedicated golden rows for keys that today only appear inside large agent chains, if reviewers want one-step isolation.
