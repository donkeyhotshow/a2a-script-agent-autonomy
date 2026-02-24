# analyze-performance

Performance analysis: bottlenecks, heavy calls, N+1.

## Priority
80

## Triggers
- performance analysis
- analyze performance
- bottlenecks

## Sub-actions

### 1. analyze-perf-scan
Identify performance-related patterns and hotspots.

**Input:** rootDir  
**Output:** hotspots[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ hotspots: Array<{ file: string; message: string }> }> {
  return { hotspots: [] };
}
```
