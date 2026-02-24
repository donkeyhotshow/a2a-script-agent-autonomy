# hybrid-improve

Improve code using AI and best practices.

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
