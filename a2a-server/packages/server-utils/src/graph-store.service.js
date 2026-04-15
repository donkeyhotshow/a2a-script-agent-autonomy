/**
 * Graph Store Service
 * Manages knowledge graph - NO PERSISTENCE, all data in context.
 */
export function mergeGraphs(existing, newGraph) {
    const entityMap = new Map();
    for (const entity of existing.entities) {
        entityMap.set(entity.id, entity);
    }
    for (const entity of newGraph.entities) {
        const existingEntity = entityMap.get(entity.id);
        if (existingEntity) {
            entityMap.set(entity.id, {
                ...existingEntity,
                ...entity,
                metadata: {
                    ...(existingEntity.metadata ?? {}),
                    ...(entity.metadata ?? {}),
                },
            });
        }
        else {
            entityMap.set(entity.id, entity);
        }
    }
    const relationMap = new Map();
    for (const relation of existing.relations) {
        relationMap.set(relation.id, relation);
    }
    for (const relation of newGraph.relations) {
        relationMap.set(relation.id, relation);
    }
    return {
        entities: Array.from(entityMap.values()),
        relations: Array.from(relationMap.values()),
    };
}
export function createEmptyGraph() {
    return { entities: [], relations: [] };
}
export function isGraphEmpty(graph) {
    return graph.entities.length === 0;
}
export function getGraphStats(graph) {
    const entityTypes = {};
    const relationTypes = {};
    for (const entity of graph.entities) {
        entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
    }
    for (const relation of graph.relations) {
        relationTypes[relation.type] = (relationTypes[relation.type] || 0) + 1;
    }
    return {
        entityCount: graph.entities.length,
        relationCount: graph.relations.length,
        entityTypes,
        relationTypes,
    };
}
//# sourceMappingURL=graph-store.service.js.map