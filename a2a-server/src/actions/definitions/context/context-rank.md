# context-rank

Ранжирование результатов: сортировка по релевантности. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md).

## Priority
75

## Triggers
- context rank
- rank context
- relevance filter
- найди релевантные файлы

## Sub-actions

### 1. context-rank-score
Score context items by relevance to a query.

**Input:** items[], query  
**Output:** ranked[]

```typescript
export default async function run(input: { items: unknown[]; query: string }): Promise<{ ranked: unknown[] }> {
  return { ranked: input.items };
}
```

### 2. context-rank-filter
Filter by score threshold or top-k.

**Input:** ranked[], topK?, minScore?  
**Output:** filtered[]

```typescript
export default async function run(input: { ranked: unknown[]; topK?: number; minScore?: number }): Promise<{ filtered: unknown[] }> {
  const k = input.topK ?? 10;
  return { filtered: Array.isArray(input.ranked) ? input.ranked.slice(0, k) : [] };
}
```
