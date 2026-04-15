/**
 * Graph Store Service
 * Manages knowledge graph - NO PERSISTENCE, all data in context
 *
 * IMPORTANT: Server does NOT store client data!
 * Graph is passed in context and returned in response.
 */
import type { RecognizedEntity, RecognizedRelation, EntityTypeName } from '../protocol/src/types/entity.types.js';
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
/**
 * Merge two graphs - combines entities and relations
 */
export declare function mergeGraphs(existing: Graph, newGraph: Graph): Graph;
/**
 * Create empty graph
 */
export declare function createEmptyGraph(): Graph;
/**
 * Check if graph is empty
 */
export declare function isGraphEmpty(graph: Graph): boolean;
/**
 * Get graph statistics
 */
export declare function getGraphStats(graph: Graph): GraphStats;
/**
 * Check if graph is complete enough for task processing
 */
export declare function isGraphComplete(graph: Graph, taskContext?: {
    taskText?: string;
    requiredTypes?: EntityTypeName[];
}): {
    complete: boolean;
    missing: string[];
};
/**
 * Filter entities by type
 */
export declare function filterEntitiesByType(graph: Graph, type: EntityTypeName): RecognizedEntity[];
/**
 * Find entity by path
 */
export declare function findEntityByPath(graph: Graph, path: string): RecognizedEntity | undefined;
/**
 * Find entity by name
 */
export declare function findEntityByName(graph: Graph, name: string): RecognizedEntity[];
/**
 * Get relations for entity
 */
export declare function getRelationsForEntity(graph: Graph, entityId: string): {
    outgoing: RecognizedRelation[];
    incoming: RecognizedRelation[];
};
/**
 * Parse graph from context (safely)
 */
export declare function parseGraphFromContext(context: Record<string, unknown>): Graph;
/**
 * Build graph from recognized entities and relations
 */
export declare function buildGraph(entities: RecognizedEntity[], relations: RecognizedRelation[]): Graph;
/**
 * Merge recognized results into existing graph
 */
export declare function mergeRecognizedIntoGraph(existing: Graph, recognized: {
    entities: RecognizedEntity[];
    relations: RecognizedRelation[];
}): Graph;
//# sourceMappingURL=graph-store.service.d.ts.map