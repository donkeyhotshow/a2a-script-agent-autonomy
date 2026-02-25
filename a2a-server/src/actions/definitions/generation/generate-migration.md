# generate-migration

Генерация миграции: изменения схемы БД. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
78

## Triggers
- generate migration
- create migration
- migration schema

## Sub-actions

### 1. generate-migration-spec
Parse schema change from task or diff.

**Input:** task, existingMigrations?  
**Output:** spec

```typescript
export default async function run(input: { task: string; existingMigrations?: string[] }): Promise<{ spec: unknown }> {
  return { spec: {} };
}
```

### 2. generate-migration-create
**Input:** spec  
**Output:** filePath

```typescript
export default async function run(input: { spec: unknown }): Promise<{ filePath: string }> {
  return { filePath: '' };
}
```
