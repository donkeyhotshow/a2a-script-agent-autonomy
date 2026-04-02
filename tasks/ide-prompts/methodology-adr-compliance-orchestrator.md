# ADR compliance battle-test orchestrator (resumable state)

## Sources

- [`methodology/adr-compliance-orchestrator.md`](../../methodology/adr-compliance-orchestrator.md)
- [`docs/adr/README.md`](../../docs/adr/README.md)

## Agent prompt (copy)

Implement or extend tooling so ADR-scoped work uses a **small external state file** (queue, current ADR, phase, completed) separate from session JSON, as described in the methodology doc. Wire to Client API session driver (`mode: agent`, task text per ADR). Document location (e.g. `runtime/adr-compliance-state.json`) and update ADR index if needed.

## Completion

- [ ] Done
