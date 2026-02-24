# fix-vue-imports-alternatives

Resolve Vue imports using alternative paths (aliases, barrel files). Variant of fix-vue-imports. Priority: 90.

## Triggers
- vue import alternatives
- resolve vue aliases
- fix vue imports alternatives

## Sub-actions

### 1. vue-import-alternatives-detect
Detect imports that can be resolved via aliases or barrel files.

**Input:** rootDir, tsconfig aliases (optional)  
**Output:** candidates[]

```typescript
export default async function run(input: { rootDir: string; aliases?: Record<string, string> }): Promise<{ candidates: Array<{ file: string; specifier: string; suggested: string }> }> {
  return { candidates: [] };
}
```
