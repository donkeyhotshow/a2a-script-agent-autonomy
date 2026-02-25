# graph-build

Построение графа знаний: извлечение сущностей и связей. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md).

## Priority
80

## Triggers
- graph build
- build graph
- knowledge graph
- построй граф
- найди зависимости

## Sub-actions

### 1. graph-parse
Парсинг кода (PHP/JS/TS/Vue).

**Input:** rootDir, files[]?  
**Output:** ast_or_tokens

```typescript
export default async function run(input: { rootDir: string; files?: string[] }): Promise<{ ast_or_tokens: unknown }> {
  return { ast_or_tokens: {} };
}
```

### 2. graph-entities
Извлечение сущностей (классы, функции, модели, контроллеры).

**Input:** ast_or_tokens  
**Output:** entities[]

```typescript
export default async function run(input: { ast_or_tokens: unknown }): Promise<{ entities: Array<{ id: string; type: string; name: string }> }> {
  return { entities: [] };
}
```

### 3. graph-relations
Построение связей (imports, extends, uses, calls).

**Input:** entities[], ast_or_tokens  
**Output:** relations[]

```typescript
export default async function run(input: { entities: unknown[]; ast_or_tokens: unknown }): Promise<{ relations: Array<{ from: string; to: string; type: string }> }> {
  return { relations: [] };
}
```

### 4. graph-store
Сохранение графа (память/БД).

**Input:** entities[], relations[]  
**Output:** graphId, nodeCount

```typescript
export default async function run(input: { entities: unknown[]; relations: unknown[] }): Promise<{ graphId: string; nodeCount: number }> {
  return { graphId: '', nodeCount: input.entities.length };
}
```
