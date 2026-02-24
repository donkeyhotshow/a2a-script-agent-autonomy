# analyze-test

Test coverage and test structure analysis.

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
