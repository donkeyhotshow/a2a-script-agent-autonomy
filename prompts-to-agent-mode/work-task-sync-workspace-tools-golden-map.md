# Sync: workspace tools golden map (maintain)

## Sources

- **Spec:** [`tasks/sync-workspace-tools-golden-map.md`](../tasks/sync-workspace-tools-golden-map.md)
- [`simulations/sync/agent-workspace-tools/description.md`](../simulations/sync/agent-workspace-tools/description.md)
- [`work/STATE.md`](../work/STATE.md) — row S12

## Agent prompt (copy)

When new workspace-style execute keys or handlers appear, update the mapping table in `agent-workspace-tools/description.md` so Web DTO / `received.json` coverage stays documented. Re-run `npm run sim:lint -- --all`.

## Completion

- [ ] Done (map current; repeat when handlers change)
