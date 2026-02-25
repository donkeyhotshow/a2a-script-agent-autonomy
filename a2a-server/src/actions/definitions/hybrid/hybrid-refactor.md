# hybrid-refactor

Refactor task: analyze + refactor (hybrid flow). **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [5-hybrid](../../../../docs/use-cases/auto-ai/5-hybrid.md).

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

### 2. hybrid-refactor-apply
Apply refactor steps (with validation).

**Input:** steps[], target  
**Output:** applied[]

```typescript
export default async function run(input: { steps: unknown[]; target: string }): Promise<{ applied: string[] }> {
  return { applied: [] };
}
```
