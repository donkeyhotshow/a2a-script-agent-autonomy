# Default LLM model id (`OLLAMA_MODEL`) — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- Dialog pipeline uses **`process.env.OLLAMA_MODEL`** or falls back to **`qwen3:8b`** (`dialog-request-processor.ts`).

## Context

Model id must exist on **Ollama** (or whatever backend resolves names). Team and CI should agree on **one default** to avoid “model not found” drift.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `qwen3-8b` | Repo default constant | Matches `AGENTS.md` examples. | Pull model before first run. |
| `env-pinned` | `OLLAMA_MODEL` in `.env` | Explicit per environment (e.g. smaller model in CI). | Document in `upstream-service-urls` table. |
| `multi-model-policy` | Per-action routing | Not only env — requires code/router changes. | Future; keep ADR if implemented. |

## Current selection (this repo)

- [ ] `qwen3-8b`
- [ ] `env-pinned`
- [ ] `multi-model-policy`

**Model string in use:**

**Notes:**

## Implementation backlog

- [ ] Align `a2a-server/docs/production/PROD_TESTS.md` model check with chosen id.

## Related

- `a2a-server/src/services/core/request-processor/dialog-request-processor.ts`
- `docs/alternatives/llm-provider/VARIANTS.md`

## Open questions

- …
