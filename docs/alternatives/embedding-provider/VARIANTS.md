# Embedding provider — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- `@a2a/embedding` supports Ollama, OpenAI, Cohere, Voyage; keys and base URLs come from env (`a2a-client/packages/embedding/src/index.ts`).

## Context

RAG quality and privacy depend on where vectors are computed: local Ollama vs hosted APIs.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `ollama-local` | Ollama | OLLAMA_BASE_URL default http://localhost:11434 | Air-gapped / local GPU |
| `openai` | OpenAI | OPENAI_API_KEY | Hosted billing |
| `cohere` | Cohere | COHERE_API_KEY | Hosted |
| `voyage` | Voyage | VOYAGE_API_KEY | Hosted |
| `shared-key` | EMBEDDING_API_KEY | Generic tooling override | |

### `ollama-local`

- **Use when:** no cloud egress.
- **Cost / risk:** model dimensions vs index schema.
- **Status:** candidate

### `openai` / `cohere` / `voyage`

- **Use when:** managed latency without local GPU.
- **Cost / risk:** keys, rate limits, compliance.
- **Status:** candidate

## Current selection (this repo)

- [ ] `ollama-local`
- [ ] `openai`
- [ ] `cohere`
- [ ] `voyage`
- [ ] `shared-key`

**Notes:**

## Implementation backlog

- [ ] Document provider + vector dim in rag ARCHITECTURE if non-default.

## Related

- `a2a-client/packages/embedding/`
- `docs/alternatives/rag-stack/VARIANTS.md`

## Open questions

- …
