# Task: Restore document hierarchy for `methodology/`

**Status: done (2026-04-03)** — Approach **B**: single source [`archive/methodology/`](../../archive/methodology/); consumers under `prompts-to-agent-mode/` updated from `../../methodology/*` → `../../archive/methodology/*`. Deleted `archive/methodology/` was **restored** from git (`git restore archive/methodology/`).

## Violation (historical)

[`.cursor/rules/document-hierarchy.mdc`](../../.cursor/rules/document-hierarchy.mdc) expects canonical docs at defined levels. Root `methodology/` was absent; content lives under [`archive/methodology/`](../../archive/methodology/).

## Definition of done

- [x] No markdown links to non-existent root `methodology/*.md` (relative `../../methodology/` removed from prompts).
- [x] `archive/methodology/` present in tree.

## Verification

- `rg "\]\(\.\./\.\./methodology/" --glob "*.md"` → no matches.
- Open-link check: [`AGENTS.md`](../../AGENTS.md) → `archive/methodology/tasks.md`.
