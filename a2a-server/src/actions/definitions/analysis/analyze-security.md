# analyze-security

Security-focused analysis: dependencies, patterns, risks. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
85

## Triggers
- security analysis
- analyze security
- security audit

## Sub-actions

### 1. analyze-security-scan
Scan for common security issues (e.g. hardcoded secrets, unsafe patterns).

**Input:** rootDir  
**Output:** findings[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ findings: Array<{ file: string; line: number; type: string }> }> {
  return { findings: [] };
}
```

### 2. analyze-security-report
Aggregate findings and produce security report (SQL injection, XSS, CSRF, secrets).

**Input:** findings[]  
**Output:** report

```typescript
export default async function run(input: { findings: Array<{ file: string; line: number; type: string }> }): Promise<{ report: string }> {
  return { report: '' };
}
```
