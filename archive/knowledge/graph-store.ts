/**
 * Graph Store
 * Stores and queries the knowledge graph
 * In-memory implementation with PostgreSQL persistence support
 */

import type { RecognizedEntity } from './entity-recognizer.js';
import type { EntityRelation, RelationType, RelationGraph } from './relation-mapper.js';
import { buildRelationGraph, getEntityRelations, getRelatedEntities, findPath, getDependencies, getDependents, calculateImportance, findCircularDependencies, getRelationStats } from './relation-mapper.js';

// ============================================
// Types
// ============================================

export interface GraphStoreOptions {
  maxEntities?: number;
  maxRelations?: number;
}

export interface StoredGraph {
  id: string;
  projectId: string;
  entities: RecognizedEntity[];
  relations: EntityRelation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphQuery {
  entityTypes?: string[];
  relationTypes?: RelationType[];
  minWeight?: number;
  maxDepth?: number;
  limit?: number;
}

// ============================================
// In-Memory Store
// ============================================

const graphs = new Map<string, StoredGraph>();
const entityIndex = new Map<string, string>(); // entityId -> graphId
const relationIndex = new Map<string, Set<string>>(); // entityId -> relationIds

// ============================================
// Main Functions
// ============================================

/**
 * Store a graph for a project
 */
export function storeGraph(
  projectId: string,
  entities: RecognizedEntity[],
  relations: EntityRelation[]
): StoredGraph {
  const id = `graph:${projectId}`;
  const now = new Date();
  
  const graph: StoredGraph = {
    id,
    projectId,
    entities,
    relations,
    createdAt: graphs.get(id)?.createdAt ?? now,
    updatedAt: now,
  };
  
  // Store graph
  graphs.set(id, graph);
  
  // Update indexes
  for (const entity of entities) {
    entityIndex.set(entity.id, id);
  }
  
  for (const relation of relations) {
    const sourceRelations = relationIndex.get(relation.sourceId) ?? new Set();
    sourceRelations.add(relation.id);
    relationIndex.set(relation.sourceId, sourceRelations);
    
    const targetRelations = relationIndex.get(relation.targetId) ?? new Set();
    targetRelations.add(relation.id);
    relationIndex.set(relation.targetId, targetRelations);
  }
  
  return graph;
}

/**
 * Get graph for a project
 */
export function getGraph(projectId: string): StoredGraph | undefined {
  return graphs.get(`graph:${projectId}`);
}

/**
 * Delete graph for a project
 */
export function deleteGraph(projectId: string): boolean {
  const id = `graph:${projectId}`;
  const graph = graphs.get(id);
  
  if (!graph) return false;
  
  // Clean up indexes
  for (const entity of graph.entities) {
    entityIndex.delete(entity.id);
  }
  
  for (const relation of graph.relations) {
    relationIndex.delete(relation.sourceId);
    relationIndex.delete(relation.targetId);
  }
  
  return graphs.delete(id);
}

/**
 * Get entity by ID
 */
export function getEntity(entityId: string): RecognizedEntity | undefined {
  const graphId = entityIndex.get(entityId);
  if (!graphId) return undefined;
  
  const graph = graphs.get(graphId);
  return graph?.entities.find((e) => e.id === entityId);
}

/**
 * Get relations for an entity
 */
export function getRelations(entityId: string): EntityRelation[] {
  const relationIds = relationIndex.get(entityId);
  if (!relationIds) return [];
  
  const graphId = entityIndex.get(entityId);
  if (!graphId) return [];
  
  const graph = graphs.get(graphId);
  if (!graph) return [];
  
  return graph.relations.filter((r) => relationIds.has(r.id));
}

/**
 * Query entities
 */
export function queryEntities(
  projectId: string,
  query: GraphQuery
): RecognizedEntity[] {
  const graph = getGraph(projectId);
  if (!graph) return [];
  
  let entities = graph.entities;
  
  // Filter by entity types
  if (query.entityTypes && query.entityTypes.length > 0) {
    entities = entities.filter((e) => query.entityTypes!.includes(e.type));
  }
  
  // Limit results
  if (query.limit && query.limit > 0) {
    entities = entities.slice(0, query.limit);
  }
  
  return entities;
}

/**
 * Query relations
 */
export function queryRelations(
  projectId: string,
  query: GraphQuery
): EntityRelation[] {
  const graph = getGraph(projectId);
  if (!graph) return [];
  
  let relations = graph.relations;
  
  // Filter by relation types
  if (query.relationTypes && query.relationTypes.length > 0) {
    relations = relations.filter((r) => query.relationTypes!.includes(r.type));
  }
  
  // Filter by minimum weight
  if (query.minWeight !== undefined) {
    relations = relations.filter((r) => r.weight >= query.minWeight!);
  }
  
  // Limit results
  if (query.limit && query.limit > 0) {
    relations = relations.slice(0, query.limit);
  }
  
  return relations;
}

// ============================================
// Graph Operations
// ============================================

/**
 * Merge entities by id. New entities overwrite existing for same id.
 */
export function mergeEntitiesById(
  existing: RecognizedEntity[],
  newEntities: RecognizedEntity[]
): RecognizedEntity[] {
  const byId = new Map<string, RecognizedEntity>();
  for (const e of existing) byId.set(e.id, e);
  for (const e of newEntities) byId.set(e.id, e);
  return Array.from(byId.values());
}

/**
 * Build and store graph from entities
 */
export function buildAndStoreGraph(
  projectId: string,
  entities: RecognizedEntity[]
): StoredGraph {
  const graph = buildRelationGraph(entities);
  
  return storeGraph(
    projectId,
    entities,
    graph.relations
  );
}

/**
 * Get relation graph for project
 */
export function getRelationGraph(projectId: string): RelationGraph | undefined {
  const stored = getGraph(projectId);
  if (!stored) return undefined;
  
  return buildRelationGraph(stored.entities);
}

/**
 * Find entities related to a query
 */
export function findRelatedEntities(
  projectId: string,
  entityId: string,
  options?: {
    relationTypes?: RelationType[];
    maxDepth?: number;
    limit?: number;
  }
): RecognizedEntity[] {
  const graph = getRelationGraph(projectId);
  if (!graph) return [];
  
  let related = getRelatedEntities(graph, entityId);
  
  // Filter by relation types
  if (options?.relationTypes && options.relationTypes.length > 0) {
    const relations = getEntityRelations(graph, entityId);
    const validTargets = new Set(
      relations
        .filter((r) => options.relationTypes!.includes(r.type))
        .map((r) => r.targetId)
    );
    related = related.filter((e) => validTargets.has(e.id));
  }
  
  // Limit results
  if (options?.limit && options.limit > 0) {
    related = related.slice(0, options.limit);
  }
  
  return related;
}

/**
 * Find path between entities
 */
export function findEntityPath(
  projectId: string,
  sourceId: string,
  targetId: string,
  maxDepth: number = 5
): RecognizedEntity[] | null {
  const graph = getRelationGraph(projectId);
  if (!graph) return null;
  
  const path = findPath(graph, sourceId, targetId, maxDepth);
  if (!path) return null;
  
  return path
    .map((id) => graph.entities.get(id))
    .filter((e): e is RecognizedEntity => e !== undefined);
}

/**
 * Get entity dependencies
 */
export function getEntityDependencies(
  projectId: string,
  entityId: string
): RecognizedEntity[] {
  const graph = getRelationGraph(projectId);
  if (!graph) return [];
  
  return getDependencies(graph, entityId);
}

/**
 * Get entity dependents
 */
export function getEntityDependents(
  projectId: string,
  entityId: string
): RecognizedEntity[] {
  const graph = getRelationGraph(projectId);
  if (!graph) return [];
  
  return getDependents(graph, entityId);
}

/**
 * Get entity importance scores
 */
export function getImportanceScores(
  projectId: string
): Map<string, number> {
  const graph = getRelationGraph(projectId);
  if (!graph) return new Map();
  
  return calculateImportance(graph);
}

/**
 * Get most important entities
 */
export function getMostImportantEntities(
  projectId: string,
  limit: number = 10
): Array<{ entity: RecognizedEntity; score: number }> {
  const scores = getImportanceScores(projectId);
  const graph = getGraph(projectId);
  if (!graph) return [];
  
  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  return sorted
    .map(([id, score]) => {
      const entity = graph.entities.find((e) => e.id === id);
      return entity ? { entity, score } : null;
    })
    .filter((item): item is { entity: RecognizedEntity; score: number } => item !== null);
}

/**
 * Find circular dependencies
 */
export function getCircularDependencies(
  projectId: string
): RecognizedEntity[][] {
  const graph = getRelationGraph(projectId);
  if (!graph) return [];
  
  const cycles = findCircularDependencies(graph);
  
  return cycles.map((path) =>
    path
      .map((id) => graph.entities.get(id))
      .filter((e): e is RecognizedEntity => e !== undefined)
  );
}

/**
 * Get graph statistics
 */
export function getGraphStats(projectId: string): ReturnType<typeof getRelationStats> | null {
  const graph = getRelationGraph(projectId);
  if (!graph) return null;
  
  return getRelationStats(graph);
}

// ============================================
// Batch Operations
// ============================================

/**
 * Clear all graphs
 */
export function clearAllGraphs(): void {
  graphs.clear();
  entityIndex.clear();
  relationIndex.clear();
}

/**
 * Get all project IDs
 */
export function getAllProjectIds(): string[] {
  return Array.from(graphs.keys()).map((id) => id.replace('graph:', ''));
}

/**
 * Get total entity count
 */
export function getTotalEntityCount(): number {
  return entityIndex.size;
}

/**
 * Get total relation count
 */
export function getTotalRelationCount(): number {
  let count = 0;
  for (const relationIds of relationIndex.values()) {
    count += relationIds.size;
  }
  return count / 2; // Each relation is indexed twice
}

// ============================================
// Export for Persistence
// ============================================

/**
 * Export graph to JSON
 */
export function exportGraph(projectId: string): string | null {
  const graph = getGraph(projectId);
  if (!graph) return null;
  
  return JSON.stringify(graph);
}

/**
 * Import graph from JSON
 */
export function importGraph(json: string): StoredGraph | null {
  try {
    const graph = JSON.parse(json) as StoredGraph;
    
    // Validate structure
    if (!graph.id || !graph.projectId || !Array.isArray(graph.entities) || !Array.isArray(graph.relations)) {
      return null;
    }
    
    // Store
    return storeGraph(graph.projectId, graph.entities, graph.relations);
  } catch {
    return null;
  }
}
