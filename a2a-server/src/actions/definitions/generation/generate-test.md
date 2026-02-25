# generate-test

Генерация тестов: Unit/Feature. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
75

## Triggers
- generate test
- create test
- unit test
- feature test

## Sub-actions

### 1. generate-test-spec
**Input:** targetFile, type? (unit|feature)  
**Output:** spec

```typescript
export default async function run(input: { targetFile: string; type?: string }): Promise<{ spec: unknown }> {
  return { spec: {} };
}
```

### 2. generate-test-create
**Input:** spec  
**Output:** filePath

```typescript
export default async function run(input: { spec: unknown }): Promise<{ filePath: string }> {
  return { filePath: '' };
}
```
