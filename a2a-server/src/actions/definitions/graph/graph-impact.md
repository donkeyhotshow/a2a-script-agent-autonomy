# graph-impact

Анализ влияния: что изменится при модификации узла. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md) (use-case 3-knowledge-graph).

## Priority
80

## Triggers
- graph impact
- impact analysis
- dependency impact
- найди зависимости

## Sub-actions

### 1. graph-impact-analyze
Compute affected nodes for a change target.

**Input:** targetPath, graphId?  
**Output:** affected[]

```typescript
// graph-impact-analyze: Compute affected nodes for a change target
// Analyzes what files/entities will be affected by changes to a target

export default async function run(input: { targetPath: string; graphId?: string }): Promise<{ affected: Array<{ id: string; type: string; name: string; file: string; impactLevel: 'direct' | 'indirect' | 'transitive' }> }> {
  // In-memory graph store (would be database in production)
  const { entities, relations } = await getGraphData(input.graphId);
  
  const targetPath = input.targetPath;
  const affected: Array<{ id: string; type: string; name: string; file: string; impactLevel: 'direct' | 'indirect' | 'transitive' }> = [];
  
  // Find target entity
  const targetEntity = entities.find(e => 
    e.file === targetPath || 
    e.id.includes(targetPath) ||
    e.name === targetPath
  );
  
  if (!targetEntity) {
    // If no entity found, return the path itself as affected
    return { affected: [{ id: targetPath, type: 'unknown', name: targetPath, file: targetPath, impactLevel: 'direct' }] };
  }
  
  // Direct dependencies (what this entity depends on)
  const directDeps = relations
    .filter(r => r.from === targetEntity.id)
    .map(r => ({
      targetId: r.to
    }));
  
  // Direct dependents (what depends on this entity)
  const directDependents = relations
    .filter(r => r.to === targetEntity.id)
    .map(r => r.from);
  
  // Add direct dependents
  for (const depId of directDependents) {
    const depEntity = entities.find(e => e.id === depId);
    if (depEntity && !affected.some(a => a.id === depEntity.id)) {
      affected.push({
        ...depEntity,
        impactLevel: 'direct'
      });
    }
  }
  
  // Find transitive dependents (entities that depend on direct dependents)
  const findTransitiveDependents = (startIds: string[], level: number): string[] => {
    if (level > 3) return []; // Max depth
    
    const allDependents: string[] = [];
    for (const id of startIds) {
      const dependents = relations
        .filter(r => r.to === id)
        .map(r => r.from);
      
      allDependents.push(...dependents);
      
      if (dependents.length > 0) {
        const nextLevel = findTransitiveDependents(dependents, level + 1);
        allDependents.push(...nextLevel);
      }
    }
    
    return [...new Set(allDependents)];
  };
  
  const transitiveDependents = findTransitiveDependents(directDependents, 1);
  
  // Add transitive dependents with impact level
  for (const depId of transitiveDependents) {
    const depEntity = entities.find(e => e.id === depId);
    if (depEntity && !affected.some(a => a.id === depEntity.id)) {
      affected.push({
        ...depEntity,
        impactLevel: 'transitive'
      });
    }
  }
  
  return { affected };
}

// Helper to get graph data (mock implementation)
async function getGraphData(graphId?: string) {
  // In production, this would fetch from database
  // For now, return empty structures
  return {
    entities: [] as Array<{ id: string; type: string; name: string; file: string }>,
    relations: [] as Array<{ from: string; to: string; type: string }>
  };
}
```

### 2. graph-impact-report
Build impact report (list of affected files/entities).

**Input:** affected[]  
**Output:** report

```typescript
// graph-impact-report: Build impact report (list of affected files/entities)

export default async function run(input: { affected: Array<{ id: string; type: string; name: string; file: string; impactLevel: 'direct' | 'indirect' | 'transitive' }> }): Promise<{ report: string; summary: { direct: number; indirect: number; transitive: number; total: number } }> {
  const { affected } = input;
  
  const summary = {
    direct: affected.filter(a => a.impactLevel === 'direct').length,
    indirect: affected.filter(a => a.impactLevel === 'indirect').length,
    transitive: affected.filter(a => a.impactLevel === 'transitive').length,
    total: affected.length
  };
  
  let report = `# Impact Analysis Report\n\n`;
  report += `## Summary\n`;
  report += `- Direct dependencies: ${summary.direct}\n`;
  report += `- Indirect dependencies: ${summary.indirect}\n`;
  report += `- Transitive dependencies: ${summary.transitive}\n`;
  report += `- Total affected: ${summary.total}\n\n`;
  
  if (summary.direct > 0) {
    report += `## Direct Impact\n`;
    report += `These entities will be directly affected:\n\n`;
    for (const entity of affected.filter(a => a.impactLevel === 'direct')) {
      report += `- \`${entity.name}\` (${entity.type}) - ${entity.file}\n`;
    }
    report += `\n`;
  }
  
  if (summary.indirect > 0) {
    report += `## Indirect Impact\n`;
    report += `These entities may be indirectly affected:\n\n`;
    for (const entity of affected.filter(a => a.impactLevel === 'indirect')) {
      report += `- \`${entity.name}\` (${entity.type}) - ${entity.file}\n`;
    }
    report += `\n`;
  }
  
  if (summary.transitive > 0) {
    report += `## Transitive Impact\n`;
    report += `These entities may be affected through chain of dependencies:\n\n`;
    for (const entity of affected.filter(a => a.impactLevel === 'transitive')) {
      report += `- \`${entity.name}\` (${entity.type}) - ${entity.file}\n`;
    }
    report += `\n`;
  }
  
  // Group by file
  const byFile = new Map<string, typeof affected>();
  for (const entity of affected) {
    const existing = byFile.get(entity.file) || [];
    existing.push(entity);
    byFile.set(entity.file, existing);
  }
  
  if (byFile.size > 0) {
    report += `## Affected Files\n`;
    for (const [file, entities] of byFile) {
      report += `### ${file}\n`;
      for (const entity of entities) {
        report += `- ${entity.name} [${entity.impactLevel}]\n`;
      }
      report += `\n`;
    }
  }
  
  report += `---\n*Generated at ${new Date().toISOString()}*\n`;
  
  return { report, summary };
}
```
