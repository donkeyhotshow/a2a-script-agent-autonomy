# hybrid-fix

Fix task: analyze + apply fixes (hybrid flow).

## Priority
85

## Triggers
- hybrid fix
- fix with analysis
- analyze and fix

## Sub-actions

### 1. hybrid-fix-analyze
Analyze target and produce fix plan.

**Input:** target, context  
**Output:** plan[]

```typescript
export default async function run(input: { target: string; context?: unknown }): Promise<{ plan: unknown[] }> {
  return { plan: [] };
}
```
