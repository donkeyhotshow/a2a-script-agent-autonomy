# Sim tools: `--under` / prefix scoping (optional)

## Sources

- **Spec (missing on disk):** `tasks/sync-readme-and-cli-gap.md` — see [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md)
- [`a2a-server/scripts/sim-validate/scanner.ts`](../a2a-server/scripts/sim-validate/scanner.ts)
- [`a2a-server/scripts/sim-lint.ts`](../a2a-server/scripts/sim-lint.ts) (entry)
- [`simulations/sync/README.md`](../simulations/sync/README.md)

## Agent prompt (copy)

Implement optional `--under <path>` or `--prefix` for `sim-validate` / `sim-lint` so operators can scope to `simulations/sync` without `--all`. Update `--help`, README examples, and the source task checklist.

## Completion

- [ ] Done
