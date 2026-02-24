# generate-model

Generate model/entity from schema or table.

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
