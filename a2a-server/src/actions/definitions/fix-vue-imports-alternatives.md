# fix-vue-imports-alternatives

Resolve Vue imports using alternative paths (aliases, barrel files). Variant of fix-vue-imports. **План:** [fix-vue-imports-alternatives](../../../plans/later/fix-vue-imports-alternatives.md).

## Priority
90

## Triggers
- vue import alternatives
- resolve vue aliases
- fix vue imports alternatives

## Sub-actions

### 1. vue-import-alternatives-detect
Detect imports that can be resolved via aliases or barrel files.

**Input:** rootDir, aliases?  
**Output:** candidates[]

```typescript
export default async function run(input: { rootDir: string; aliases?: Record<string, string> }): Promise<{ candidates: Array<{ file: string; specifier: string; suggested: string }> }> {
  return { candidates: [] };
}
```

### 2. vue-import-alternatives-resolve
Resolve each candidate to best path (alias vs relative vs barrel).

**Input:** candidates[], aliases?  
**Output:** patches[]

```typescript
export default async function run(input: { candidates: Array<{ file: string; specifier: string; suggested: string }>; aliases?: Record<string, string> }): Promise<{ patches: Array<{ file: string; line: number; from: string; to: string }> }> {
  return { patches: [] };
}
```

### 3. vue-import-alternatives-apply
Apply patches to files.

**Input:** patches[]  
**Output:** fixed_files[]

```typescript
export default async function run(input: { patches: Array<{ file: string; line: number; from: string; to: string }> }): Promise<{ fixed_files: string[] }> {
  return { fixed_files: [] };
}
```
