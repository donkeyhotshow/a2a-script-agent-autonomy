# graph-impact

Анализ влияния: что изменится при модификации узла. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md) (use-case 3-knowledge-graph).

## Priority
80

## Triggers
- graph impact
- impact analysis
- dependency impact
- найди зависимости

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

### 2. graph-impact-report
Build impact report (list of affected files/entities).

**Input:** affected[]  
**Output:** report

```typescript
export default async function run(input: { affected: string[] }): Promise<{ report: string }> {
  return { report: input.affected.join('\n') };
}
```
