# graph-query

Запрос к графу: поиск связей и зависимостей. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md) (use-case 3-knowledge-graph).

## Priority

75

## Triggers

- graph query
- query graph
- search graph
- покажи связи

## Sub-actions

### 1. graph-query-run

Run query against the graph.

**Input:** query, graphId?  
**Output:** results[]

```typescript
// graph-query-run: Run query against the graph
// Supports various query types: find by name, find dependencies, find dependents, path finding

export default async function run(input: { query: string; graphId?: string }): Promise<{ results: Array<{ id: string; type: string; name: string; file: string; score?: number }> }> {
  // In production, this would query from database
  const { entities, relations } = await getGraphData(input.graphId);
  
  const query = input.query.toLowerCase();
  const results: Array<{ id: string; type: string; name: string; file: string; score?: number }> = [];
  
  // Parse query type
  let queryType: 'search' | 'dependencies' | 'dependents' | 'path' = 'search';
  let queryTarget: string = '';
  
  if (query.includes('depends on') || query.includes('uses') || query.includes('imports')) {
    queryType = 'dependencies';
    queryTarget = query.replace(/(?:depends on|uses|imports)\s*/i, '').trim();
  } else if (query.includes('used by') || query.includes('depended by')) {
    queryType = 'dependents';
    queryTarget = query.replace(/(?:used by|depended by)\s*/i, '').trim();
  } else if (query.includes('path')) {
    queryType = 'path';
    const pathMatch = query.match(/path\s+(?:from|between)\s+(\w+)\s+(?:to|and)\s+(\w+)/i);
    if (pathMatch) {
      queryTarget = pathMatch[1] + '->' + pathMatch[2];
    }
  } else {
    // Default to search
    queryTarget = query;
  }
  
  if (queryType === 'search') {
    // Search by name or type
    for (const entity of entities) {
      const nameMatch = entity.name.toLowerCase().includes(queryTarget);
      const typeMatch = entity.type.toLowerCase() === queryTarget;
      const fileMatch = entity.file.toLowerCase().includes(queryTarget);
      
      if (nameMatch || typeMatch || fileMatch) {
        results.push({
          ...entity,
          score: (nameMatch ? 1 : 0) + (typeMatch ? 0.5 : 0) + (fileMatch ? 0.3 : 0)
        });
      }
    }
    
    // Sort by score
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    
  } else if (queryType === 'dependencies') {
    // Find what the target entity depends on
    const targetEntity = entities.find(e => 
      e.name.toLowerCase() === queryTarget || 
      e.id.includes(queryTarget)
    );
    
    if (targetEntity) {
      const deps = relations
        .filter(r => r.from === targetEntity.id)
        .map(r => r.to);
      
      for (const depId of deps) {
        const depEntity = entities.find(e => e.id === depId);
        if (depEntity) {
          results.push(depEntity);
        }
      }
    }
    
  } else if (queryType === 'dependents') {
    // Find what depends on the target entity
    const targetEntity = entities.find(e => 
      e.name.toLowerCase() === queryTarget || 
      e.id.includes(queryTarget)
    );
    
    if (targetEntity) {
      const dependents = relations
        .filter(r => r.to === targetEntity.id)
        .map(r => r.from);
      
      for (const depId of dependents) {
        const depEntity = entities.find(e => e.id === depId);
        if (depEntity) {
          results.push(depEntity);
        }
      }
    }
    
  } else if (queryType === 'path') {
    // Find path between two entities
    const [startName, endName] = queryTarget.split('->');
    const startEntity = entities.find(e => e.name.toLowerCase() === startName?.trim());
    const endEntity = entities.find(e => e.name.toLowerCase() === endName?.trim());
    
    if (startEntity && endEntity) {
      const path = findShortestPath(startEntity.id, endEntity.id, relations);
      for (const nodeId of path) {
        const node = entities.find(e => e.id === nodeId);
        if (node) {
          results.push(node);
        }
      }
    }
  }
  
  return { results };
}

// BFS for shortest path
function findShortestPath(startId: string, endId: string, relations: Array<{ from: string; to: string }>): string[] {
  const queue: string[][] = [[startId]];
  const visited = new Set<string>([startId]);
  
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    
    if (current === endId) {
      return path;
    }
    
    const neighbors = relations
      .filter(r => r.from === current)
      .map(r => r.to);
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  
  return [];
}

// Helper to get graph data (mock implementation)
async function getGraphData(graphId?: string) {
  return {
    entities: [] as Array<{ id: string; type: string; name: string; file: string }>,
    relations: [] as Array<{ from: string; to: string; type: string }>
  };
}
```

### 2. graph-query-format

Format results for client (entities + relations).

**Input:** results[]  
**Output:** formatted

```typescript
// graph-query-format: Format results for client (entities + relations)

export default async function run(input: { results: Array<{ id: string; type: string; name: string; file: string; score?: number }> }): Promise<{ formatted: { entities: Array<{ id: string; type: string; name: string; file: string }>; relations: Array<{ from: string; to: string; type: string }>; summary: string; count: number } }> {
  const { results } = input;
  
  const entities = results.map(r => ({
    id: r.id,
    type: r.type,
    name: r.name,
    file: r.file
  }));
  
  // Get relations between results
  const { relations } = await getGraphData();
  const resultIds = new Set(results.map(r => r.id));
  
  const filteredRelations = relations.filter(r => 
    resultIds.has(r.from) && resultIds.has(r.to)
  );
  
  // Generate summary
  const typeCounts = new Map<string, number>();
  for (const entity of entities) {
    typeCounts.set(entity.type, (typeCounts.get(entity.type) || 0) + 1);
  }
  
  let summary = `Found ${entities.length} result(s): `;
  const typeSummary: string[] = [];
  for (const [type, count] of typeCounts) {
    typeSummary.push(`${count} ${type}(s)`);
  }
  summary += typeSummary.join(', ');
  
  return {
    formatted: {
      entities,
      relations: filteredRelations,
      summary,
      count: entities.length
    }
  };
}

// Helper to get graph data (mock implementation)
async function getGraphData() {
  return {
    relations: [] as Array<{ from: string; to: string; type: string }>
  };
}
```
