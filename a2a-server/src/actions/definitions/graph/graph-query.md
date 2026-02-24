# graph-query

Query knowledge graph.

## Priority
75

## Triggers
- graph query
- query graph
- search graph

## Sub-actions

### 1. graph-query-run
Run query against the graph.

**Input:** query, graphId?  
**Output:** results[]

```typescript
export default async function run(input: { query: string; graphId?: string }): Promise<{ results: unknown[] }> {
  return { results: [] };
}
```
