# fix-vue-imports-improvements

Improvements and refinements for Vue import fixing. Variant of fix-vue-imports. **План:** [fix-vue-imports-improvements](../../../plans/later/fix-vue-imports-improvements.md).

## Priority
85

## Triggers
- improve vue imports
- fix vue imports improvements
- vue import refinements

## Sub-actions

### 1. vue-import-improvements-analyze
Analyze current import style and suggest improvements (path style, barrel usage).

**Input:** rootDir  
**Output:** suggestions[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ suggestions: Array<{ file: string; message: string }> }> {
  return { suggestions: [] };
}
```

### 2. vue-import-improvements-apply
Apply suggested improvements (optional batch).

**Input:** suggestions[], rootDir  
**Output:** applied[]

```typescript
export default async function run(input: { suggestions: Array<{ file: string; message: string }>; rootDir: string }): Promise<{ applied: string[] }> {
  return { applied: [] };
}
```
