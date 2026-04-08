# Code Duplication: Meilisearch Interfaces

## Description
Several interfaces are duplicated between the rag and sdk packages for Meilisearch functionality.

## Files Involved
- `a2a-client/packages/rag/src/meilisearch-client.ts`
- `a2a-client/packages/sdk/src/server/services/meilisearch-client.ts`

## Duplicated Interfaces
- `MeilisearchConfig` (identical in both files)
- `MeilisearchDocument` (identical in both files)
- `MeilisearchSearchResult` (identical in both files)
- `MeilisearchSearchOptions` (likely identical)

Additionally, `DEFAULT_SETTINGS` and `createMeilisearchClient` function are exported in both files.

## Recommendation
Extract interfaces and constants into a shared module or separate package.