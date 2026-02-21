/**
 * Relation Mapper
 * Maps relationships between entities: uses, creates, extends, implements
 * Production-ready: pattern matching, graph building
 */

import type { RecognizedEntity, EloquentRelationship } from './entity-recognizer.js';

// ============================================
// Types
// ============================================

export type RelationType =
  | 'uses'          // A uses B (import, dependency)
  | 'creates'       // A creates B (factory, seeder)
  | 'extends'       // A extends B (inheritance)
  | 'implements'    // A implements B (interface)
  | 'has-many'      // Eloquent hasMany
  | 'belongs-to'    // Eloquent belongsTo
  | 'belongs-to-many' // Eloquent belongsToMany
  | 'has-one'       // Eloquent hasOne
  | 'calls'         // A calls B (method call)
  | 'references'    // A references B (type reference)
  | 'renders'       // A renders B (Vue component)
  | 'provides'      // A provides B (composable, store)
  | 'handles'       // A handles B (controller handles request)
  | 'validates';    // A validates B (request validates model)

export interface EntityRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  weight: number; // 0-1, importance of relation
  metadata?: {
    method?: string;
    line?: number;
    context?: string;
  };
}

export interface RelationGraph {
  entities: Map<string, RecognizedEntity>;
  relations: EntityRelation[];
  adjacencyList: Map<string, Set<string>>;
  reverseAdjacencyList: Map<string, Set<string>>;
}

// ============================================
// Main Functions
// ============================================

/**
 * Build relation graph from entities
 */
export function buildRelationGraph(entities: RecognizedEntity[]): RelationGraph {
  const entityMap = new Map<string, RecognizedEntity>();
  const relations: EntityRelation[] = [];
  const adjacencyList = new Map<string, Set<string>>();
  const reverseAdjacencyList = new Map<string, Set<string>>();
  
  // Index entities
  for (const entity of entities) {
    entityMap.set(entity.id, entity);
    adjacencyList.set(entity.id, new Set());
    reverseAdjacencyList.set(entity.id, new Set());
  }
  
  // Extract relations
  for (const entity of entities) {
    const entityRelations = extractRelations(entity, entityMap);
    
    for (const relation of entityRelations) {
      relations.push(relation);
      
      // Update adjacency lists
      const sourceAdj = adjacencyList.get(relation.sourceId);
      const targetRevAdj = reverseAdjacencyList.get(relation.targetId);
      
      if (sourceAdj) sourceAdj.add(relation.targetId);
      if (targetRevAdj) targetRevAdj.add(relation.sourceId);
    }
  }
  
  return {
    entities: entityMap,
    relations,
    adjacencyList,
    reverseAdjacencyList,
  };
}

/**
 * Extract relations from a single entity
 */
function extractRelations(
  entity: RecognizedEntity,
  entityMap: Map<string, RecognizedEntity>
): EntityRelation[] {
  const relations: EntityRelation[] = [];
  
  // Extract extends relation
  if (entity.metadata.extends) {
    const targetEntity = findEntityByName(entityMap, entity.metadata.extends);
    if (targetEntity) {
      relations.push(createRelation(
        entity.id,
        targetEntity.id,
        'extends',
        0.9
      ));
    }
  }
  
  // Extract implements relations
  if (entity.metadata.implements) {
    for (const impl of entity.metadata.implements) {
      const targetEntity = findEntityByName(entityMap, impl);
      if (targetEntity) {
        relations.push(createRelation(
          entity.id,
          targetEntity.id,
          'implements',
          0.8
        ));
      }
    }
  }
  
  // Extract uses relations from imports
  if (entity.metadata.imports) {
    for (const imp of entity.metadata.imports) {
      const targetEntity = findEntityByImport(entityMap, imp);
      if (targetEntity) {
        relations.push(createRelation(
          entity.id,
          targetEntity.id,
          'uses',
          0.5
        ));
      }
    }
  }
  
  // Extract Eloquent relationships
  if (entity.metadata.relationships) {
    for (const rel of entity.metadata.relationships) {
      const targetEntity = findEntityByName(entityMap, rel.related);
      if (targetEntity) {
        relations.push(createRelation(
          entity.id,
          targetEntity.id,
          mapEloquentToRelation(rel.type),
          0.7,
          { method: rel.name }
        ));
      }
    }
  }
  
  // Extract renders relations (Vue components)
  if (entity.type === 'vue-component' || entity.type === 'vue-page') {
    const renderedComponents = extractRenderedComponents(entity);
    for (const comp of renderedComponents) {
      const targetEntity = findEntityByName(entityMap, comp);
      if (targetEntity) {
        relations.push(createRelation(
          entity.id,
          targetEntity.id,
          'renders',
          0.6
        ));
      }
    }
  }
  
  // Extract handles relations (controllers)
  if (entity.type === 'controller') {
    const handledModels = extractHandledModels(entity);
    for (const model of handledModels) {
      const targetEntity = findEntityByName(entityMap, model);
      if (targetEntity) {
        relations.push(createRelation(
          entity.id,
          targetEntity.id,
          'handles',
          0.7
        ));
      }
    }
  }
  
  // Extract validates relations (form requests)
  if (entity.type === 'request') {
    const validatedModels = extractValidatedModels(entity);
    for (const model of validatedModels) {
      const targetEntity = findEntityByName(entityMap, model);
      if (targetEntity) {
        relations.push(createRelation(
          entity.id,
          targetEntity.id,
          'validates',
          0.8
        ));
      }
    }
  }
  
  return relations;
}

// ============================================
// Helper Functions
// ============================================

function createRelation(
  sourceId: string,
  targetId: string,
  type: RelationType,
  weight: number,
  metadata?: EntityRelation['metadata']
): EntityRelation {
  const relation: EntityRelation = {
    id: `${sourceId}:${type}:${targetId}`,
    sourceId,
    targetId,
    type,
    weight,
  };
  
  if (metadata) {
    relation.metadata = metadata;
  }
  
  return relation;
}

function findEntityByName(
  entityMap: Map<string, RecognizedEntity>,
  name: string
): RecognizedEntity | undefined {
  for (const entity of entityMap.values()) {
    if (entity.name === name) {
      return entity;
    }
  }
  return undefined;
}

function findEntityByImport(
  entityMap: Map<string, RecognizedEntity>,
  importPath: string
): RecognizedEntity | undefined {
  // Extract name from import path
  const parts = importPath.split('/');
  const name = parts[parts.length - 1]?.replace(/\.(ts|vue|js)$/, '');
  
  if (!name) return undefined;
  
  return findEntityByName(entityMap, name);
}

function mapEloquentToRelation(type: EloquentRelationship['type']): RelationType {
  const mapping: Record<string, RelationType> = {
    'hasMany': 'has-many',
    'belongsTo': 'belongs-to',
    'belongsToMany': 'belongs-to-many',
    'hasOne': 'has-one',
    'morphMany': 'has-many',
    'morphTo': 'belongs-to',
  };
  return mapping[type] ?? 'references';
}

function extractRenderedComponents(entity: RecognizedEntity): string[] {
  const components: string[] = [];
  
  // Look for component usage in metadata
  if (entity.metadata.imports) {
    for (const imp of entity.metadata.imports) {
      if (imp.endsWith('.vue') || imp.includes('/components/')) {
        const name = imp.split('/').pop()?.replace('.vue', '');
        if (name) components.push(name);
      }
    }
  }
  
  return components;
}

function extractHandledModels(entity: RecognizedEntity): string[] {
  const models: string[] = [];
  
  // Infer from controller name (e.g., UserController -> User)
  const match = entity.name.match(/(\w+)Controller/);
  if (match && match[1]) {
    models.push(match[1]);
  }
  
  return models;
}

function extractValidatedModels(entity: RecognizedEntity): string[] {
  const models: string[] = [];
  
  // Infer from request name (e.g., StoreUserRequest -> User)
  const match = entity.name.match(/(?:Store|Update|Create|Delete)(\w+)Request/);
  if (match && match[1]) {
    models.push(match[1]);
  }
  
  return models;
}

// ============================================
// Graph Queries
// ============================================

/**
 * Get all relations for an entity
 */
export function getEntityRelations(
  graph: RelationGraph,
  entityId: string,
  direction: 'outgoing' | 'incoming' | 'both' = 'both'
): EntityRelation[] {
  return graph.relations.filter((r) => {
    if (direction === 'outgoing') return r.sourceId === entityId;
    if (direction === 'incoming') return r.targetId === entityId;
    return r.sourceId === entityId || r.targetId === entityId;
  });
}

/**
 * Get related entities
 */
export function getRelatedEntities(
  graph: RelationGraph,
  entityId: string,
  relationType?: RelationType
): RecognizedEntity[] {
  const relations = graph.relations.filter((r) => {
    const matches = r.sourceId === entityId || r.targetId === entityId;
    return matches && (!relationType || r.type === relationType);
  });
  
  const relatedIds = new Set<string>();
  for (const r of relations) {
    if (r.sourceId !== entityId) relatedIds.add(r.sourceId);
    if (r.targetId !== entityId) relatedIds.add(r.targetId);
  }
  
  return Array.from(relatedIds)
    .map((id) => graph.entities.get(id))
    .filter((e): e is RecognizedEntity => e !== undefined);
}

/**
 * Find path between two entities
 */
export function findPath(
  graph: RelationGraph,
  sourceId: string,
  targetId: string,
  maxDepth: number = 5
): string[] | null {
  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [
    { id: sourceId, path: [sourceId] },
  ];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.id === targetId) {
      return current.path;
    }
    
    if (current.path.length >= maxDepth) {
      continue;
    }
    
    if (visited.has(current.id)) {
      continue;
    }
    
    visited.add(current.id);
    
    const neighbors = graph.adjacencyList.get(current.id);
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({
            id: neighborId,
            path: [...current.path, neighborId],
          });
        }
      }
    }
  }
  
  return null;
}

/**
 * Get entity dependencies (all entities this entity depends on)
 */
export function getDependencies(
  graph: RelationGraph,
  entityId: string
): RecognizedEntity[] {
  const visited = new Set<string>();
  const dependencies: RecognizedEntity[] = [];
  
  function traverse(id: string) {
    const neighbors = graph.adjacencyList.get(id);
    if (!neighbors) return;
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const entity = graph.entities.get(neighborId);
        if (entity) {
          dependencies.push(entity);
        }
        traverse(neighborId);
      }
    }
  }
  
  traverse(entityId);
  return dependencies;
}

/**
 * Get entity dependents (all entities that depend on this entity)
 */
export function getDependents(
  graph: RelationGraph,
  entityId: string
): RecognizedEntity[] {
  const visited = new Set<string>();
  const dependents: RecognizedEntity[] = [];
  
  function traverse(id: string) {
    const neighbors = graph.reverseAdjacencyList.get(id);
    if (!neighbors) return;
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const entity = graph.entities.get(neighborId);
        if (entity) {
          dependents.push(entity);
        }
        traverse(neighborId);
      }
    }
  }
  
  traverse(entityId);
  return dependents;
}

/**
 * Calculate entity importance (PageRank-like)
 */
export function calculateImportance(
  graph: RelationGraph,
  iterations: number = 10
): Map<string, number> {
  const scores = new Map<string, number>();
  const n = graph.entities.size;
  
  // Initialize scores
  for (const id of graph.entities.keys()) {
    scores.set(id, 1 / n);
  }
  
  // Iterate
  for (let i = 0; i < iterations; i++) {
    const newScores = new Map<string, number>();
    
    for (const [id] of graph.entities) {
      const incoming = graph.reverseAdjacencyList.get(id);
      let score = 0.15 / n; // Damping factor
      
      if (incoming) {
        for (const sourceId of incoming) {
          const sourceScore = scores.get(sourceId) ?? 0;
          const outgoing = graph.adjacencyList.get(sourceId);
          const outDegree = outgoing?.size ?? 1;
          score += 0.85 * (sourceScore / outDegree);
        }
      }
      
      newScores.set(id, score);
    }
    
    // Update scores
    for (const [id, score] of newScores) {
      scores.set(id, score);
    }
  }
  
  return scores;
}

/**
 * Find circular dependencies
 */
export function findCircularDependencies(graph: RelationGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(id: string) {
    visited.add(id);
    recursionStack.add(id);
    path.push(id);
    
    const neighbors = graph.adjacencyList.get(id);
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          dfs(neighborId);
        } else if (recursionStack.has(neighborId)) {
          // Found cycle
          const cycleStart = path.indexOf(neighborId);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
          }
        }
      }
    }
    
    path.pop();
    recursionStack.delete(id);
  }
  
  for (const id of graph.entities.keys()) {
    if (!visited.has(id)) {
      dfs(id);
    }
  }
  
  return cycles;
}

/**
 * Get relation statistics
 */
export function getRelationStats(graph: RelationGraph): {
  totalEntities: number;
  totalRelations: number;
  byType: Record<RelationType, number>;
  avgConnectivity: number;
  maxConnectivity: { id: string; count: number };
} {
  const byType: Record<RelationType, number> = {
    'uses': 0, 'creates': 0, 'extends': 0, 'implements': 0,
    'has-many': 0, 'belongs-to': 0, 'belongs-to-many': 0, 'has-one': 0,
    'calls': 0, 'references': 0, 'renders': 0, 'provides': 0,
    'handles': 0, 'validates': 0,
  };
  
  for (const relation of graph.relations) {
    byType[relation.type]++;
  }
  
  let totalConnectivity = 0;
  let maxConn = { id: '', count: 0 };
  
  for (const [id, neighbors] of graph.adjacencyList) {
    const count = neighbors.size;
    totalConnectivity += count;
    if (count > maxConn.count) {
      maxConn = { id, count };
    }
  }
  
  return {
    totalEntities: graph.entities.size,
    totalRelations: graph.relations.length,
    byType,
    avgConnectivity: graph.entities.size > 0 
      ? totalConnectivity / graph.entities.size 
      : 0,
    maxConnectivity: maxConn,
  };
}
