# Distill: `plans/cursor-answers/` and `plans/codex-answers/`

## Artifact

- **Paths:** [`plans/cursor-answers/`](../../plans/cursor-answers/), [`plans/codex-answers/`](../../plans/codex-answers/) — imported Q&A / long-form chat exports.
- **Sibling:** [`plans/README.md`](../../plans/README.md), [`plans/MASTER-INDEX.md`](../../plans/MASTER-INDEX.md) (structured action tables).

## Why (Brown)

**Overlapping** narrative with `a2a-server/src/actions/definitions/*.md` and `docs/`; high noise-to-signal unless indexed or archived.

## Actions

1. **Map** each dump to **one** canonical owner: ADR, action definition, or `docs/` section.
2. **Delete** pure duplicates; **move** still-useful unique content into the target doc **or** under `archive/plans/` with a dated README.
3. **Update** `plans/MASTER-INDEX.md` so it does not imply chat logs are maintained sources.

## Done when

Chat import folders are either removed, archived, or reduced to pointers; index matches reality.
