# context-rank

Rank and filter context by relevance.

## Priority
75

## Triggers
- context rank
- rank context
- relevance filter

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
