# Sync: validate `N-sub-M` substeps (sim-validate)

## Sources

- **Spec (missing on disk):** `tasks/sync-substeps-not-discovered.md` — see [repo-task-specs-missing-restore.md](repo-task-specs-missing-restore.md)
- [`a2a-server/scripts/sim-validate/scanner.ts`](../a2a-server/scripts/sim-validate/scanner.ts)
- [`simulations/sync/README.md`](../simulations/sync/README.md) — substeps section
- [`work/STATE.md`](../work/STATE.md) — row S9

## Agent prompt (copy)

Substeps are validated by default in `sim-validate --all`; use `--skip-substeps` to exclude. Documented in `simulations/SCHEMA.md` and `SERVER-CONTRACT.md`. Task file: `tasks/sync-substeps-not-discovered.md`.

## Completion

- [x] Done
