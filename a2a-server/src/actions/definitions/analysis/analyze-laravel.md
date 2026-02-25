# analyze-laravel

Анализ Laravel: validation, eager loading. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
72

## Triggers
- laravel analysis
- analyze laravel
- missing validation
- eager loading

## Sub-actions

### 1. analyze-laravel-scan
Scan for missing validation, N+1, eager loading.

**Input:** rootDir  
**Output:** findings[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ findings: unknown[] }> {
  return { findings: [] };
}
```

### 2. analyze-laravel-report
**Input:** findings[]  
**Output:** report

```typescript
export default async function run(input: { findings: unknown[] }): Promise<{ report: string }> {
  return { report: '' };
}
```
