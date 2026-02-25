# context-scan

Scan workspace: структура, технологии, зависимости. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md).

## Priority
80

## Triggers
- context scan
- scan context
- index files
- собери контекст

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

### 2. context-scan-detect-tech
Detect structure, technologies, dependencies from file list.

**Input:** files[]  
**Output:** structure, technologies[], dependencies

```typescript
export default async function run(input: { files: Array<{ path: string; size?: number }> }): Promise<{ structure: unknown; technologies: string[]; dependencies?: unknown }> {
  return { structure: {}, technologies: [] };
}
```
