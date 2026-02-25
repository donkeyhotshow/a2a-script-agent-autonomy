# context-index

Build searchable index (vector/RAG) from project context. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md).

## Priority
80

## Triggers
- context index
- build index
- index context
- индексация кода

## Sub-actions

### 1. context-index-build
Build index from scanned files (chunking, embeddings for RAG).

**Input:** files[]  
**Output:** indexId, entryCount

```typescript
export default async function run(input: { files: unknown[] }): Promise<{ indexId: string; entryCount: number }> {
  return { indexId: '', entryCount: 0 };
}
```

### 2. context-index-save
Persist index for later queries.

**Input:** indexId, entryCount  
**Output:** saved

```typescript
export default async function run(input: { indexId: string; entryCount: number }): Promise<{ saved: boolean }> {
  return { saved: true };
}
```
