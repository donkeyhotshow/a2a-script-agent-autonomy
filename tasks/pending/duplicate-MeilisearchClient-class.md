# Code Duplication: MeilisearchClient class

The entire MeilisearchClient class, interfaces (MeilisearchConfig, MeilisearchDocument), and createMeilisearchClient function are duplicated between two packages.

**Locations:**
- `a2a-client/packages/sdk/src/server/services/meilisearch-client.ts`: Lines 22-215
- `a2a-client/packages/rag/src/meilisearch-client.ts`: Lines 7-202

**Additional:** DEFAULT_SETTINGS constant is also duplicated:
- Inline in sdk (lines 9-14)
- In `a2a-client/packages/rag/src/meilisearch-defaults.ts`: Lines 1-6

**Recommendation:** Extract MeilisearchClient to a shared package or utility to eliminate duplication.