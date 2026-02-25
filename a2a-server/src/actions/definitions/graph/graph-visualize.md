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
// graph-visualize-export: Export graph to DOT (GraphViz) or JSON format
// Supports DOT (GraphViz), JSON (for web visualization), Mermaid

export default async function run(input: { graphId?: string; format?: 'dot' | 'json' | 'mermaid' }): Promise<{ exportContent: string; format: string; nodeCount: number; edgeCount: number }> {
  const format = input.format || 'dot';
  
  // Get graph data (from in-memory store or database)
  const { entities, relations } = await getGraphData(input.graphId);
  
  let exportContent = '';
  
  if (format === 'dot') {
    // Generate DOT format for GraphViz
    exportContent = 'digraph KnowledgeGraph {\n';
    exportContent += '  rankdir=LR;\n';
    exportContent += '  node [shape=box, style=filled];\n';
    exportContent += '  edge [arrowhead=normal];\n\n';
    
    // Define nodes
    const nodeStyles: Record<string, string> = {
      class: 'fillcolor=lightblue',
      interface: 'fillcolor=lightgreen',
      function: 'fillcolor=lightyellow',
      method: 'fillcolor=lightyellow',
      component: 'fillcolor=lightpink',
      trait: 'fillcolor=lightgray'
    };
    
    for (const entity of entities) {
      const style = nodeStyles[entity.type] || 'fillcolor=white';
      const label = entity.name.replace(/"/g, '\\"');
      exportContent += `  "${entity.id}" [label="${label}" ${style}];\n`;
    }
    
    exportContent += '\n';
    
    // Define edges
    const edgeStyles: Record<string, string> = {
      imports: 'arrowhead=vee,color=blue',
      extends: 'arrowhead=empty,color=purple',
      implements: 'arrowhead=empty,color=green',
      uses: 'arrowhead=vee,color=orange',
      calls: 'arrowhead=vee,color=red',
      contains: 'arrowhead=normal,color=gray,style=dashed'
    };
    
    for (const relation of relations) {
      const style = edgeStyles[relation.type] || 'arrowhead=normal';
      exportContent += `  "${relation.from}" -> "${relation.to}" [${style}];\n`;
    }
    
    exportContent += '}\n';
    
  } else if (format === 'json') {
    // Generate JSON format for web visualization
    const jsonOutput = {
      nodes: entities.map(e => ({
        id: e.id,
        label: e.name,
        type: e.type,
        file: e.file
      })),
      edges: relations.map(r => ({
        source: r.from,
        target: r.to,
        type: r.type
      }))
    };
    exportContent = JSON.stringify(jsonOutput, null, 2);
    
  } else if (format === 'mermaid') {
    // Generate Mermaid diagram
    exportContent = '```mermaid\n';
    exportContent += 'graph TD;\n';
    
    for (const entity of entities) {
      const safeId = entity.id.replace(/[^a-zA-Z0-9]/g, '_');
      exportContent += `    ${safeId}[${entity.name}];\n`;
    }
    
    for (const relation of relations) {
      const fromSafe = relation.from.replace(/[^a-zA-Z0-9]/g, '_');
      const toSafe = relation.to.replace(/[^a-zA-Z0-9]/g, '_');
      
      let arrow = '-->';
      if (relation.type === 'imports') arrow = '--imports--> ';
      else if (relation.type === 'extends') arrow = '--extends--> ';
      else if (relation.type === 'implements') arrow = '--implements--> ';
      else if (relation.type === 'calls') arrow = '--calls--> ';
      
      exportContent += `    ${fromSafe}${arrow}${toSafe};\n`;
    }
    
    exportContent += '```\n';
  }
  
  return {
    exportContent,
    format,
    nodeCount: entities.length,
    edgeCount: relations.length
  };
}

// Helper to get graph data (mock implementation)
async function getGraphData(graphId?: string) {
  return {
    entities: [] as Array<{ id: string; type: string; name: string; file: string }>,
    relations: [] as Array<{ from: string; to: string; type: string }>
  };
}
```
