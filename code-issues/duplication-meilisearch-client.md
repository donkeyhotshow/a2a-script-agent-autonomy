# Code Duplication: MeilisearchClient Class

## Description
The `MeilisearchClient` class is nearly identical in two different packages: rag and sdk.

## Files Involved
- `a2a-client/packages/rag/src/meilisearch-client.ts` (lines 38-202)
- `a2a-client/packages/sdk/src/server/services/meilisearch-client.ts` (lines 46-215)

## Details
The implementations are nearly identical, with minor differences in variable naming (e.g., `searchParams` vs `payload`). Both include the same methods: `initialize`, `_getIndexes`, `_createIndex`, `_waitForIndex`, `_configureIndex`, `addDocuments`, `search`, `deleteDocument`, `deleteAllDocuments`, `getStats`, `isAvailable`, `getHealth`.

## Recommendation
Extract Meilisearch functionality into a separate shared package or consolidate into one package.