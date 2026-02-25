# generate-view

Генерация представления: Blade/Vue компонент. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
75

## Triggers
- generate view
- create view
- blade component
- vue component

## Sub-actions

### 1. generate-view-spec
**Input:** task, stack? (blade|vue)  
**Output:** spec

```typescript
export default async function run(input: { task: string; stack?: string }): Promise<{ spec: unknown }> {
  return { spec: {} };
}
```

### 2. generate-view-create
**Input:** spec  
**Output:** filePath

```typescript
export default async function run(input: { spec: unknown }): Promise<{ filePath: string }> {
  return { filePath: '' };
}
```
