/**
 * Graph Store Service
 * Manages knowledge graph - NO PERSISTENCE, all data in context.
 */
export type EntityTypeName = string;
export interface RecognizedEntity {
    id: string;
    type: EntityTypeName;
    name?: string;
    metadata?: Record<string, unknown>;
}
export interface RecognizedRelation {
    id: string;
    type: string;
    from: string;
    to: string;
    metadata?: Record<string, unknown>;
}
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
export declare function mergeGraphs(existing: Graph, newGraph: Graph): Graph;
export declare function createEmptyGraph(): Graph;
export declare function isGraphEmpty(graph: Graph): boolean;
export declare function getGraphStats(graph: Graph): GraphStats;
//# sourceMappingURL=graph-store.service.d.ts.map