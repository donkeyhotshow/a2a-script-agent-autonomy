# graph-visualize

Визуализация графа: экспорт в GraphViz и др. План: actions-definitions-for-auto-ai, use-case 3.

## Priority
70

## Triggers
- graph visualize
- export graphviz
- graph export
- покажи граф

## Sub-actions

### 1. graph-visualize-export
Export graph to DOT (GraphViz) or other format.

**Input:** graphId?, format?  
**Output:** exportContent

```typescript
export default async function run(input: { graphId?: string; format?: 'dot' | 'json' }): Promise<{ exportContent: string }> {
  return { exportContent: '' };
}
```
