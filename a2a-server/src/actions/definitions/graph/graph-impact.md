# graph-impact

Impact analysis using the graph (dependencies, affected nodes).

## Priority
80

## Triggers
- graph impact
- impact analysis
- dependency impact

## Sub-actions

### 1. graph-impact-analyze
Compute affected nodes for a change target.

**Input:** targetPath, graphId?  
**Output:** affected[]

```typescript
export default async function run(input: { targetPath: string; graphId?: string }): Promise<{ affected: string[] }> {
  return { affected: [] };
}
```
