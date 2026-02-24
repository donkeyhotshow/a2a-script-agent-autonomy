# hybrid-explain

Explain code with AI and context.

## Priority
75

## Triggers
- explain code
- hybrid explain
- what does this do

## Sub-actions

### 1. hybrid-explain-context
Gather code and related context.

**Input:** target, rootDir?  
**Output:** context

```typescript
export default async function run(input: { target: string; rootDir?: string }): Promise<{ context: unknown }> {
  return { context: {} };
}
```

### 2. hybrid-explain-llm
Generate explanation via AI.

**Input:** context  
**Output:** explanation

```typescript
export default async function run(input: { context: unknown }): Promise<{ explanation: string }> {
  return { explanation: '' };
}
```
