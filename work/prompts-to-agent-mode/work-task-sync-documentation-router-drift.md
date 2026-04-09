# Sync: agent docs + router fixture parity

## Sources

- **Spec:** [`tasks/sync-documentation-and-router-drift.md`](../tasks/sync-documentation-and-router-drift.md)
- [`simulations/sync/agent/description.md`](../simulations/sync/agent/description.md)
- [`shared/router-static-choices.json`](../shared/router-static-choices.json)
- [`work/STATE.md`](../work/STATE.md) — row S10

## Agent prompt (copy)

Execute remaining items in the task spec: keep router choice ids aligned with `shared/router-static-choices.json`; eliminate label/description drift in sync goldens (`sync/agent/*`, `agent-analyze`, `agent-coder`, `agent-coder-smart`, `agent-auto-ai` as listed in spec). Run sim lint/validate. Check off **Done when** in the source task file and update [`work/STATE.md`](../work/STATE.md).

## Completion

- [ ] Done (all checkboxes in source task satisfied)
