# analyze-typescript

Анализ TypeScript: any types, missing props. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
72

## Triggers
- typescript analysis
- analyze typescript
- any types
- missing props

## Sub-actions

### 1. analyze-ts-scan
Scan TS/TSX for any, implicit any, missing props.

**Input:** rootDir  
**Output:** findings[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ findings: Array<{ file: string; line: number; message: string }> }> {
  return { findings: [] };
}
```

### 2. analyze-ts-report
**Input:** findings[]  
**Output:** report

```typescript
export default async function run(input: { findings: unknown[] }): Promise<{ report: string }> {
  return { report: '' };
}
```
