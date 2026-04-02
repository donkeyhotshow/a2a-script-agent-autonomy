# Sync: add LLM snapshot fixtures where needed

## Sources

- **Spec:** [`tasks/sync-llm-snapshot-coverage.md`](../tasks/sync-llm-snapshot-coverage.md)
- [`simulations/sync/README.md`](../simulations/sync/README.md) — LLM snapshot coverage
- [`a2a-server/prompts/`](../a2a-server/prompts/) (templates)
- [`work/STATE.md`](../work/STATE.md) — row S11

## Agent prompt (copy)

Pick representative high-value sync flows lacking `request.md`/`response.md` and add minimal golden snapshots to guard prompt assembly (`render-markdown`, truncations, etc.). Keep single action-key shape. Run `sim:lint` / `sim:validate`. Update source task + `work/STATE.md`.

## Completion

- [x] Partial (2026-04-02) — `sync/dialog/2–4` `request.md` headers + `description.md` path/notes; [`tasks/sync-llm-snapshot-coverage.md`](../tasks/sync-llm-snapshot-coverage.md) backlog narrowed. Optional: audit other sync sims for missing step MD.
