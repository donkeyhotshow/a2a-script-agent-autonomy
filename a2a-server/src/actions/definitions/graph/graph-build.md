# graph-build

Build or update knowledge graph from context.

## Priority
80

## Triggers
- graph build
- build graph
- knowledge graph

## Sub-actions

### 1. graph-build-nodes
Extract nodes (entities, files) and build graph.

**Input:** context, rootDir?  
**Output:** graphId, nodeCount

```typescript
export default async function run(input: { context: unknown; rootDir?: string }): Promise<{ graphId: string; nodeCount: number }> {
  return { graphId: '', nodeCount: 0 };
}
```
