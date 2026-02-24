# analyze-security

Security-focused analysis: dependencies, patterns, risks.

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
