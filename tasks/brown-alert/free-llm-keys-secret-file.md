# Distill: `FREE_LLM_KEYS.md` (secrets at root)

## Artifact

- **Path:** [`FREE_LLM_KEYS.md`](../../FREE_LLM_KEYS.md) — contains **live API keys** and sample curl commands.

## Why (Brown)

This is **not** canonical documentation; it is **high-risk noise** (secrets + rot). It does not belong in the shared doc pool as-is.

## Actions

1. **Rotate** all exposed keys at providers (assume compromise if ever pushed).
2. **Remove** the file from the repo or replace with **placeholders only** + pointer to `.env.example` / `docs/ENV-MATRIX.md`.
3. **Add** `FREE_LLM_KEYS.md` to `.gitignore` if a local copy is kept for the operator only.
4. **Never** commit real keys again; use env vars or a secrets manager.

## Done when

No real keys in tracked files; team knows where to configure providers locally.
