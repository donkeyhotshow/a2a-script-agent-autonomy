# hybrid-improve

Improve code using AI and best practices. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [5-hybrid](../../../../docs/use-cases/auto-ai/5-hybrid.md).

## Priority
80

## Triggers
- improve code
- hybrid improve
- best practices

## Sub-actions

### 1. hybrid-improve-analyze
Analyze target and suggest improvements.

**Input:** target, context  
**Output:** suggestions[]

```typescript
export default async function run(input: { target: string; context?: unknown }): Promise<{ suggestions: unknown[] }> {
  return { suggestions: [] };
}
```

### 2. hybrid-improve-apply
Apply selected improvements.

**Input:** suggestions[], target, selection?  
**Output:** applied[]

```typescript
export default async function run(input: { suggestions: unknown[]; target: string; selection?: number[] }): Promise<{ applied: string[] }> {
  return { applied: [] };
}
```
