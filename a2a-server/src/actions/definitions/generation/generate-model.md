# generate-model

Generate model/entity from schema or table. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
80

## Triggers
- generate model
- model generation
- create model

## Sub-actions

### 1. generate-model-create
Create model file with properties.

**Input:** modelName, schema?  
**Output:** filePath

```typescript
export default async function run(input: { modelName: string; schema?: unknown }): Promise<{ filePath: string }> {
  return { filePath: '' };
}
```

### 2. generate-model-relationships
Add relationships (belongsTo, hasMany, etc.) to model.

**Input:** filePath, schema?  
**Output:** filePath

```typescript
export default async function run(input: { filePath: string; schema?: unknown }): Promise<{ filePath: string }> {
  return { filePath: input.filePath };
}
```
