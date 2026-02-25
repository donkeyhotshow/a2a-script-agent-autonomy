# analyze-vue

Анализ Vue: prop drilling, Options API, a11y. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
72

## Triggers
- vue analysis
- analyze vue
- prop drilling
- options api
- a11y

## Sub-actions

### 1. analyze-vue-scan
Scan Vue files for patterns (prop drilling, Options API, a11y).

**Input:** rootDir  
**Output:** findings[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ findings: unknown[] }> {
  return { findings: [] };
}
```

### 2. analyze-vue-report
**Input:** findings[]  
**Output:** report

```typescript
export default async function run(input: { findings: unknown[] }): Promise<{ report: string }> {
  return { report: '' };
}
```
