# graph-extract-entities

Извлечение сущностей: классы, функции, модели, контроллеры. План: actions-definitions-for-auto-ai.

## Priority
78

## Triggers
- extract entities
- graph entities
- parse code entities

## Sub-actions

### 1. graph-entities-parse
Parse files and extract entity nodes.

**Input:** files[], rootDir?  
**Output:** entities[]

```typescript
export default async function run(input: { files: string[]; rootDir?: string }): Promise<{ entities: Array<{ id: string; type: string; name: string }> }> {
  return { entities: [] };
}
```
