# analyze-architecture

Analyze project architecture and layers.

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
