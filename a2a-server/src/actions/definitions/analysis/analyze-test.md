# analyze-test

Test coverage and test structure analysis. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
75

## Triggers
- test analysis
- analyze tests
- coverage analysis

## Sub-actions

### 1. analyze-test-scan
Scan test files and summarize structure/coverage hints.

**Input:** rootDir  
**Output:** testFiles[], summary

```typescript
export default async function run(input: { rootDir: string }): Promise<{ testFiles: string[]; summary: unknown }> {
  return { testFiles: [], summary: {} };
}
```

### 2. analyze-test-report
Report missing tests, coverage gaps.

**Input:** testFiles[], summary  
**Output:** report

```typescript
export default async function run(input: { testFiles: string[]; summary: unknown }): Promise<{ report: string }> {
  return { report: '' };
}
```
