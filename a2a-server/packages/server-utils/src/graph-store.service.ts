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

export function mergeGraphs(existing: Graph, newGraph: Graph): Graph {
  const entityMap = new Map<string, RecognizedEntity>();
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
    } else {
      entityMap.set(entity.id, entity);
    }
  }

  const relationMap = new Map<string, RecognizedRelation>();
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

export function createEmptyGraph(): Graph {
  return { entities: [], relations: [] };
}

export function isGraphEmpty(graph: Graph): boolean {
  return graph.entities.length === 0;
}

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
