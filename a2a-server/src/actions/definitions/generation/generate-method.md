# generate-method

Генерация метода: добавление метода в класс. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
75

## Triggers
- generate method
- add method
- добавить метод

## Sub-actions

### 1. generate-method-analyze
Parse target class and task.

**Input:** targetFile, task  
**Output:** spec

```typescript
export default async function run(input: { targetFile: string; task: string }): Promise<{ spec: unknown }> {
  return { spec: {} };
}
```

### 2. generate-method-llm
**Input:** spec  
**Output:** draft

```typescript
export default async function run(input: { spec: unknown }): Promise<{ draft: string }> {
  return { draft: '' };
}
```

### 3. generate-method-apply
**Input:** draft, targetFile  
**Output:** applied

```typescript
export default async function run(input: { draft: string; targetFile: string }): Promise<{ applied: boolean }> {
  return { applied: false };
}
```
