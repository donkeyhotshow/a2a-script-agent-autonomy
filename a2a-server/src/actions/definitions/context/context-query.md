# context-query

Query project context (semantic or keyword).

## Priority
75

## Triggers
- context query
- query context
- search context

## Sub-actions

### 1. context-query-run
Run a query against the context index.

**Input:** query, indexId?, limit  
**Output:** results[]

```typescript
export default async function run(input: { query: string; indexId?: string; limit?: number }): Promise<{ results: unknown[] }> {
  return { results: [] };
}
```
