# context-scan

Scan workspace and build file/context index.

## Priority
80

## Triggers
- context scan
- scan context
- index files

## Sub-actions

### 1. context-scan-files
Walk project and collect file list with basic metadata.

**Input:** rootDir, ignore[]  
**Output:** files[]

```typescript
export default async function run(input: { rootDir: string; ignore?: string[] }): Promise<{ files: Array<{ path: string; size?: number }> }> {
  return { files: [] };
}
```
