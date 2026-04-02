# PROTOCOLS index: align “implemented” matrix with server + goldens

## Sources

- [`docs/new-request-flow/PROTOCOLS/README.md`](../../docs/new-request-flow/PROTOCOLS/README.md) — action/state tables with ❌
- [`docs/new-request-flow/PROTOCOLS/actions/README.md`](../../docs/new-request-flow/PROTOCOLS/actions/README.md)
- [`docs/new-request-flow/PROTOCOLS/STAGES/03-execution.md`](../../docs/new-request-flow/PROTOCOLS/STAGES/03-execution.md)
- [`docs/new-request-flow/PROTOCOLS/states/README.md`](../../docs/new-request-flow/PROTOCOLS/states/README.md)
- Code: [`a2a-server/src/actions/handlers/`](../../a2a-server/src/actions/handlers/)
- Goldens: [`simulations/sync/`](../../simulations/sync/) / [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md)

## Agent prompt (copy)

Several PROTOCOL docs still mark `grep-search`, `file-exists`, `edit-patch`, `run-script`, etc. as **не реализовано** while the server and sync simulations exercise them. Rebuild the status columns (✅/partial/❌) from code + sim coverage; fix per-action doc headers (`run-script.md`, …) where the top banner contradicts reality. Keep honest ❌ only where truly absent.

## Completion

- [ ] Done
