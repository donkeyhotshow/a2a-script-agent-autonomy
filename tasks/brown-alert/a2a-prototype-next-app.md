# Distill: `a2a-prototype/` (Next.js app)

## Artifact

- **Path:** [`a2a-prototype/`](../../a2a-prototype/) — standalone Next.js UI (`app/`, `components/`, own `AGENTS.md` / `CLAUDE.md`).

## Why (Brown)

A **second client** competes with the main `a2a-client` story unless relationship is explicit (demo, spike, deprecated).

## Actions

1. **Document** in root [`README.md`](../../README.md) or [`docs/`](../../docs/): what this package is for, how to run it, whether it is supported in CI.
2. **If** it is a dead spike: **archive** (zip or subtree under `archive/`) and remove from `package.json` workspaces if any.
3. **If** active: align env/port docs with [`docs/SYSTEM_STARTUP.md`](../../docs/SYSTEM_STARTUP.md) so operators are not confused.

## Done when

No ambiguous “mystery app” in the tree; status is explicit in one canonical doc.
