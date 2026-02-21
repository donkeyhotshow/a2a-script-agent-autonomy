# ADR 0020: Plexe ML — planned

## Status

proposed

## Date

2026-02-20

## Context

Embeddings for semantic search. Config has PLEXE_API_URL, embeddingDimension.

## Decision

- `ml/plexe.client.ts`: `getEmbedding()`, `classify()` — stubs, throw "not implemented"
- Config: `plexeApiUrl`, `plexeApiKey`, `embeddingDimension`, `chunkMaxTokens`, `chunkOverlapTokens`
- Prisma: Embedding model, ChunkType enum
- README: "Plexer ML" — future embeddings for semantic matching

## Consequences

- ML pipeline not active
- Entity recognizer uses regex; no vector search yet
