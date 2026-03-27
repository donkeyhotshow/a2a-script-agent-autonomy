# LF-C-04: Decompose rag-searcher.ts

## Problem
`packages/rag/src/searcher/rag-searcher.ts` is ~836 lines - needs decomposition.

## Solution
Split into:
- `searcher/query-planner.ts` - Query planning
- `searcher/chunk-pipeline.ts` - Chunk processing
- `searcher/ranking-pipeline.ts` - Result ranking
- `searcher/output-shaping.ts` - Output formatting

## Where
- File: `a2a-client/packages/rag/src/searcher/rag-searcher.ts`

## Verification
```bash
cd a2a-client && npm test -- --grep rag
```
