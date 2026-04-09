# Distill: stray `request.md` / `prompt.md` copies

## Artifacts

- [`request.md`](../../request.md) — long **system prompt** at repo root (agent contract + response format).
- [`a2a-server/request.md`](../../a2a-server/request.md), [`a2a-server/prompt.md`](../../a2a-server/prompt.md) — similar prompt material next to the server package.

## Why (Brown)

Prompts should have **one canonical home** (e.g. `prompts/`, `a2a-server/prompts/`, or a named file under `docs/new-request-flow/`). Multiple copies **drift** and confuse which file generators/tools read.

## Actions

1. **Identify** the authoritative source for “agent request” text (grep imports / build scripts).
2. **Merge** duplicates into that path; **delete** or replace others with a short pointer (`<!-- see ../prompts/... -->`).
3. **Document** in `README.md` or `a2a-server/README.md` where operators edit prompts.

## Done when

No unexplained duplicate `request.md` / `prompt.md` trees; one source of truth.
