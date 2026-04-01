# Sync: add LLM snapshot fixtures where needed

## Sources

- **Spec (missing on disk):** `tasks/sync-llm-snapshot-coverage.md` — see [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md)
- [`simulations/sync/README.md`](../simulations/sync/README.md) — LLM snapshot coverage
- [`a2a-server/prompts/`](../a2a-server/prompts/) (templates)
- [`work/STATE.md`](../work/STATE.md) — row S11

## Agent prompt (copy)

Pick representative high-value sync flows lacking `request.md`/`response.md` and add minimal golden snapshots to guard prompt assembly (`render-markdown`, truncations, etc.). Keep single action-key shape. Run `sim:lint` / `sim:validate`. Update source task + `work/STATE.md`.

## Completion

- [ ] Done
