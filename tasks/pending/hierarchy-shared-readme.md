# Task: `shared/` README (document hierarchy)

**Status:** done (2026-04-03) — [`shared/README.md`](../../shared/README.md) includes purpose, file inventory, and **Where each asset is loaded** table linking to `router-static.ts` and tests.

## Violation (historical)

[`.cursor/rules/document-hierarchy.mdc`](../../.cursor/rules/document-hierarchy.mdc): significant trees should expose **purpose + quickstart + key files**. [`shared/`](../../shared/) has **no README** while holding cross-cutting assets (e.g. router JSON consumed by server/client).

## Definition of done

Add [`shared/README.md`](../../shared/README.md) with:

1. One-sentence **purpose** (shared contracts between a2a-server / a2a-client / tooling).
2. **Key files** table or bullet list (e.g. `router-static-choices.json`, any other top-level files).
3. **Link** to where each asset is loaded in code (file path or ADR) — no vague prose.

## Verification

- README exists; links resolve relative to repo root.
