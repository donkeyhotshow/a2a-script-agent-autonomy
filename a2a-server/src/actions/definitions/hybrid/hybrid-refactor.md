# hybrid-refactor

Refactor task: analyze + refactor (hybrid flow).

## Priority
85

## Triggers
- hybrid refactor
- refactor with analysis
- analyze and refactor

## Sub-actions

### 1. hybrid-refactor-analyze
Analyze code and produce refactor steps.

**Input:** target, context  
**Output:** steps[]

```typescript
export default async function run(input: { target: string; context?: unknown }): Promise<{ steps: unknown[] }> {
  return { steps: [] };
}
```
