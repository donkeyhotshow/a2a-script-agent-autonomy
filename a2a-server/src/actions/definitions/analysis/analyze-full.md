# analyze-full

Full project analysis: structure, dependencies, and hotspots.

## Priority
80

## Triggers
- full analysis
- analyze project
- project analysis

## Sub-actions

### 1. analyze-full-scan
Scan project structure and collect metadata.

**Input:** rootDir  
**Output:** structure, fileCount

```typescript
export default async function run(input: { rootDir: string }): Promise<{ structure: unknown; fileCount: number }> {
  return { structure: {}, fileCount: 0 };
}
```
