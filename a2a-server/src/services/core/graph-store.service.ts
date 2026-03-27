/**
 * Graph Store Service
 * Manages knowledge graph - NO PERSISTENCE, all data in context
 *
 * IMPORTANT: Server does NOT store client data!
 * Graph is passed in context and returned in response.
 */

import type {
    RecognizedEntity,
    RecognizedRelation,
    EntityTypeName
} from '../types/entity.types.js';

// ============================================
// Types
// ============================================

export interface Graph {
    entities: RecognizedEntity[];
    relations: RecognizedRelation[];
}

export interface GraphStats {
    entityCount: number;
    relationCount: number;
    entityTypes: Record<string, number>;
    relationTypes: Record<string, number>;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Merge two graphs - combines entities and relations
 */
export function mergeGraphs(existing: Graph, newGraph: Graph): Graph {
    const entityMap = new Map<string, RecognizedEntity>();

    // Add existing entities
    for (const entity of existing.entities) {
        entityMap.set(entity.id, entity);
    }

    // Merge new entities (overwrite by id)
    for (const entity of newGraph.entities) {
        const existingEntity = entityMap.get(entity.id);
        if (existingEntity) {
            // Merge metadata
            entityMap.set(entity.id, {
                ...existingEntity,
                ...entity,
                metadata: {
                    ...existingEntity.metadata,
                    ...entity.metadata,
                },
            });
        } else {
            entityMap.set(entity.id, entity);
        }
    }

    const relationMap = new Map<string, RecognizedRelation>();

    // Add existing relations
    for (const relation of existing.relations) {
        relationMap.set(relation.id, relation);
    }

    // Merge new relations (overwrite by id)
    for (const relation of newGraph.relations) {
        relationMap.set(relation.id, relation);
    }

    return {
        entities: Array.from(entityMap.values()),
        relations: Array.from(relationMap.values()),
    };
}

/**
 * Create empty graph
 */
export function createEmptyGraph(): Graph {
    return {entities: [], relations: []};
}

/**
 * Check if graph is empty
 */
export function isGraphEmpty(graph: Graph): boolean {
    return graph.entities.length === 0;
}

/**
 * Get graph statistics
 */
export function getGraphStats(graph: Graph): GraphStats {
    const entityTypes: Record<string, number> = {};
    const relationTypes: Record<string, number> = {};

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

/**
 * Check if graph is complete enough for task processing
 */
export function isGraphComplete(
    graph: Graph,
    taskContext?: { taskText?: string; requiredTypes?: EntityTypeName[] }
): { complete: boolean; missing: string[] } {
    const missing: string[] = [];

    // Basic completeness: at least one entity
    if (graph.entities.length === 0) {
        missing.push('No entities recognized');
        return {complete: false, missing};
    }

    // Check for required types if specified
    if (taskContext?.requiredTypes) {
        const presentTypes = new Set(graph.entities.map(e => e.type));
        for (const required of taskContext.requiredTypes) {
            if (!presentTypes.has(required)) {
                missing.push(`Missing entity type: ${required}`);
            }
        }
    }

    // Check for common patterns
    const hasController = graph.entities.some(e => e.type === 'CONTROLLER');
    const hasModel = graph.entities.some(e => e.type === 'MODEL');

    // If task mentions CRUD, need both controller and model
    if (taskContext?.taskText?.toLowerCase().includes('crud')) {
        if (!hasController) missing.push('Missing Controller for CRUD operation');
        if (!hasModel) missing.push('Missing Model for CRUD operation');
    }

    // If task mentions form/validation, need Request or validation logic
    if (taskContext?.taskText?.toLowerCase().includes('form')) {
        const hasRequest = graph.entities.some(e => e.type === 'REQUEST');
        if (!hasRequest && !hasController) {
            missing.push('Missing Request or Controller for form handling');
        }
    }

    return {complete: missing.length === 0, missing};
}

/**
 * Filter entities by type
 */
export function filterEntitiesByType(graph: Graph, type: EntityTypeName): RecognizedEntity[] {
    return graph.entities.filter(e => e.type === type);
}

/**
 * Find entity by path
 */
export function findEntityByPath(graph: Graph, path: string): RecognizedEntity | undefined {
    return graph.entities.find(e => e.path === path);
}

/**
 * Find entity by name
 */
export function findEntityByName(graph: Graph, name: string): RecognizedEntity[] {
    return graph.entities.filter(e => e.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get relations for entity
 */
export function getRelationsForEntity(graph: Graph, entityId: string): {
    outgoing: RecognizedRelation[];
    incoming: RecognizedRelation[];
} {
    return {
        outgoing: graph.relations.filter(r => r.fromId === entityId),
        incoming: graph.relations.filter(r => r.toId === entityId),
    };
}

/**
 * Parse graph from context (safely)
 */
export function parseGraphFromContext(context: Record<string, unknown>): Graph {
    const rawGraph = context['graph'];

    if (!rawGraph || typeof rawGraph !== 'object') {
        return createEmptyGraph();
    }

    const graph = rawGraph as Record<string, unknown>;

    const entities = Array.isArray(graph['entities'])
        ? graph['entities'].filter((e): e is RecognizedEntity =>
            typeof e === 'object' && e !== null && 'id' in e && 'type' in e && 'path' in e
        )
        : [];

    const relations = Array.isArray(graph['relations'])
        ? graph['relations'].filter((r): r is RecognizedRelation =>
            typeof r === 'object' && r !== null && 'id' in r && 'type' in r && 'fromPath' in r
        )
        : [];

    return {entities, relations};
}

/**
 * Build graph from recognized entities and relations
 */
export function buildGraph(
    entities: RecognizedEntity[],
    relations: RecognizedRelation[]
): Graph {
    return {
        entities,
        relations,
    };
}

/**
 * Merge recognized results into existing graph
 */
export function mergeRecognizedIntoGraph(
    existing: Graph,
    recognized: { entities: RecognizedEntity[]; relations: RecognizedRelation[] }
): Graph {
    return mergeGraphs(existing, {
        entities: recognized.entities,
        relations: recognized.relations,
    });
}
