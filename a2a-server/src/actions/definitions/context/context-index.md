# context-index

Build searchable index from project context.

## Priority
80

## Triggers
- context index
- build index
- index context

## Sub-actions

### 1. context-index-build
Build index from scanned files (e.g. for RAG/search).

**Input:** files[]  
**Output:** indexId, entryCount

```typescript
export default async function run(input: { files: unknown[] }): Promise<{ indexId: string; entryCount: number }> {
  return { indexId: '', entryCount: 0 };
}
```
