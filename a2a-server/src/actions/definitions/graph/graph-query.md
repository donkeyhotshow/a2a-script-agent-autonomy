# graph-query

Запрос к графу: поиск связей и зависимостей. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md) (use-case 3-knowledge-graph).

## Priority
75

## Triggers
- graph query
- query graph
- search graph
- покажи связи

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

### 2. graph-query-format
Format results for client (entities + relations).

**Input:** results[]  
**Output:** formatted

```typescript
export default async function run(input: { results: unknown[] }): Promise<{ formatted: { entities: unknown[]; relations: unknown[] } }> {
  return { formatted: { entities: [], relations: [] } };
}
```
