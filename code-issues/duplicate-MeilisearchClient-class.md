Duplicate `MeilisearchClient` class found in:
- a2a-client/packages/rag/src/meilisearch-client.ts
- a2a-client/packages/sdk/src/server/services/meilisearch-client.ts

Both files contain the same class definition for interacting with Meilisearch search engine. This duplication violates DRY principles and should be consolidated into a shared package or one implementation should be removed.