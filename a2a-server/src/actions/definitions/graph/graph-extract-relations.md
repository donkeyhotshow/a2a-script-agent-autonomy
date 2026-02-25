# graph-extract-relations

Извлечение связей: imports, extends, uses, calls. План: actions-definitions-for-auto-ai.

## Priority
78

## Triggers
- extract relations
- graph relations
- build relations

## Sub-actions

### 1. graph-relations-parse
Build relations between entities from AST/code.

**Input:** entities[], ast_or_files  
**Output:** relations[]

```typescript
export default async function run(input: { entities: unknown[]; ast_or_files?: unknown }): Promise<{ relations: Array<{ from: string; to: string; type: string }> }> {
  return { relations: [] };
}
```
