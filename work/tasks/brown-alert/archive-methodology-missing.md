# Distill: missing `archive/methodology/`

## Artifact

- **Paths:** `archive/methodology/tasks.md`, `archive/methodology/INDEX.md`, `archive/methodology/adr-compliance-orchestrator.md`, and others referenced from [`AGENTS.md`](../../AGENTS.md), [`docs/WORKFLOW.md`](../../docs/WORKFLOW.md), [`docs/agent-iteration-traps.md`](../../docs/agent-iteration-traps.md), [`docs/adr/README.md`](../../docs/adr/README.md), [`prompts-to-agent-mode/ONE-PIPELINE.md`](../../prompts-to-agent-mode/ONE-PIPELINE.md), etc.
- **Fact:** The `archive/` directory is **not** present at repo root (links are dead).

## Why (Brown)

Value (methodology wording, queue protocol) is **trapped in broken links** instead of one canonical place.

## Actions

1. **Choose:** Restore `archive/methodology/` from git history **or** retarget every link to existing files (`tasks/README.md`, `docs/adr/`, a dedicated `docs/methodology/` if you add it).
2. **Distill:** Any unique protocol text should live in **one** canonical doc; avoid duplicating `AGENTS.md` long-form.
3. **Verify:** `rg "archive/methodology"` returns only real paths or is empty.

## Done when

All references resolve; no broken `archive/methodology` links in tracked markdown.
