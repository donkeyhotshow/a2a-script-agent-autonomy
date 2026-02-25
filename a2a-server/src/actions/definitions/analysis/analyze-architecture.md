# analyze-architecture

Analyze project architecture and layers. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
80

## Triggers
- architecture analysis
- analyze architecture
- project layers

## Sub-actions

### 1. analyze-arch-scan
Detect architectural boundaries and layers.

**Input:** rootDir  
**Output:** layers[], boundaries[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ layers: string[]; boundaries: unknown[] }> {
  return { layers: [], boundaries: [] };
}
```

### 2. analyze-arch-detect-patterns
Detect God objects, duplicated code, layer violations.

**Input:** layers[], boundaries[], rootDir  
**Output:** issues[]

```typescript
export default async function run(input: { layers: string[]; boundaries: unknown[]; rootDir: string }): Promise<{ issues: Array<{ file: string; message: string }> }> {
  return { issues: [] };
}
```
