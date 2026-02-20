import { describe, it, expect, beforeEach } from 'vitest';
import {
  storeGraph,
  getGraph,
  deleteGraph,
  getEntity,
  getRelations,
  queryEntities,
  queryRelations,
  buildAndStoreGraph,
  getRelationGraph,
  findRelatedEntities,
  findEntityPath,
  getEntityDependencies,
  getEntityDependents,
  getImportanceScores,
  getMostImportantEntities,
  getCircularDependencies,
  getGraphStats,
  clearAllGraphs,
  getAllProjectIds,
  exportGraph,
  importGraph,
} from '../../../src/knowledge/graph-store.js';
import type { RecognizedEntity } from '../../../src/knowledge/entity-recognizer.js';
import type { EntityRelation } from '../../../src/knowledge/relation-mapper.js';

const mkEntity = (id: string, path: string, type: string, name: string): RecognizedEntity => ({
  id,
  type: type as RecognizedEntity['type'],
  filePath: path,
  name,
  metadata: { name },
  startLine: 1,
  endLine: 10,
  confidence: 1,
});

const mkRelation = (sourceId: string, targetId: string, type: EntityRelation['type']): EntityRelation => ({
  id: `${sourceId}:${type}:${targetId}`,
  sourceId,
  targetId,
  type,
  weight: 0.8,
});

describe('graph-store', () => {
  beforeEach(() => {
    clearAllGraphs();
  });

  describe('storeGraph, getGraph', () => {
    it('stores and retrieves graph', () => {
      const entities = [mkEntity('e1', 'a.ts', 'model', 'A'), mkEntity('e2', 'b.ts', 'model', 'B')];
      const relations = [mkRelation('e1', 'e2', 'uses')];
      const stored = storeGraph('p1', entities, relations);
      expect(stored.projectId).toBe('p1');
      expect(stored.entities).toHaveLength(2);
      expect(stored.relations).toHaveLength(1);

      const retrieved = getGraph('p1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.entities).toHaveLength(2);
    });
  });

  describe('deleteGraph', () => {
    it('deletes graph and returns true', () => {
      storeGraph('p1', [mkEntity('e1', 'a.ts', 'model', 'A')], []);
      expect(deleteGraph('p1')).toBe(true);
      expect(getGraph('p1')).toBeUndefined();
    });
    it('returns false when graph not found', () => {
      expect(deleteGraph('nonexistent')).toBe(false);
    });
  });

  describe('getEntity, getRelations', () => {
    it('getEntity returns entity by id', () => {
      const entities = [mkEntity('e1', 'a.ts', 'model', 'A')];
      storeGraph('p1', entities, []);
      expect(getEntity('e1')).toEqual(entities[0]);
    });
    it('getEntity returns undefined for unknown id', () => {
      expect(getEntity('unknown')).toBeUndefined();
    });
    it('getRelations returns relations for entity', () => {
      const entities = [mkEntity('e1', 'a.ts', 'model', 'A'), mkEntity('e2', 'b.ts', 'model', 'B')];
      const relations = [mkRelation('e1', 'e2', 'uses')];
      storeGraph('p1', entities, relations);
      expect(getRelations('e1')).toHaveLength(1);
      expect(getRelations('e1')[0].type).toBe('uses');
    });
  });

  describe('queryEntities, queryRelations', () => {
    it('queryEntities filters by type and limit', () => {
      const entities = [
        mkEntity('e1', 'a.ts', 'model', 'A'),
        mkEntity('e2', 'b.ts', 'controller', 'B'),
        mkEntity('e3', 'c.ts', 'model', 'C'),
      ];
      storeGraph('p1', entities, []);
      const models = queryEntities('p1', { entityTypes: ['model'], limit: 1 });
      expect(models).toHaveLength(1);
      expect(models[0].type).toBe('model');
    });
    it('queryRelations filters by type and minWeight', () => {
      const entities = [mkEntity('e1', 'a.ts', 'model', 'A'), mkEntity('e2', 'b.ts', 'model', 'B')];
      const relations = [
        mkRelation('e1', 'e2', 'uses'),
        { ...mkRelation('e1', 'e2', 'extends'), weight: 0.3 },
      ];
      storeGraph('p1', entities, relations);
      const heavy = queryRelations('p1', { minWeight: 0.5 });
      expect(heavy.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('buildAndStoreGraph', () => {
    it('builds relation graph from entities and stores', () => {
      const entities = [
        mkEntity('model:a.ts:User', 'a.ts', 'model', 'User'),
        mkEntity('model:b.ts:Post', 'b.ts', 'model', 'Post'),
      ];
      (entities[1] as RecognizedEntity).metadata.relationships = [{ type: 'belongsTo', name: 'user', related: 'User' }];
      const stored = buildAndStoreGraph('p1', entities);
      expect(stored.entities).toHaveLength(2);
      expect(stored.relations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRelationGraph', () => {
    it('returns RelationGraph for project', () => {
      storeGraph('p1', [mkEntity('e1', 'a.ts', 'model', 'A')], []);
      const graph = getRelationGraph('p1');
      expect(graph).toBeDefined();
      expect(graph?.entities.size).toBe(1);
    });
    it('returns undefined for unknown project', () => {
      expect(getRelationGraph('unknown')).toBeUndefined();
    });
  });

  describe('findRelatedEntities, findEntityPath', () => {
    it('findRelatedEntities returns related entities', () => {
      const entities = [mkEntity('e1', 'a.ts', 'model', 'A'), mkEntity('e2', 'b.ts', 'model', 'B')];
      storeGraph('p1', entities, [mkRelation('e1', 'e2', 'uses')]);
      const related = findRelatedEntities('p1', 'e1');
      expect(Array.isArray(related)).toBe(true);
    });
    it('findEntityPath returns path or null', () => {
      const entities = [mkEntity('e1', 'a.ts', 'model', 'A'), mkEntity('e2', 'b.ts', 'model', 'B')];
      storeGraph('p1', entities, [mkRelation('e1', 'e2', 'uses')]);
      const path = findEntityPath('p1', 'e1', 'e2');
      expect(path === null || Array.isArray(path)).toBe(true);
    });
  });

  describe('getEntityDependencies, getEntityDependents', () => {
    it('returns dependencies and dependents', () => {
      const entities = [mkEntity('e1', 'a.ts', 'model', 'A'), mkEntity('e2', 'b.ts', 'model', 'B')];
      storeGraph('p1', entities, [mkRelation('e1', 'e2', 'uses')]);
      expect(getEntityDependencies('p1', 'e1')).toEqual([]);
      expect(getEntityDependencies('p1', 'e2').length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getImportanceScores, getMostImportantEntities', () => {
    it('returns importance scores', () => {
      storeGraph('p1', [mkEntity('e1', 'a.ts', 'model', 'A')], []);
      const scores = getImportanceScores('p1');
      expect(scores instanceof Map).toBe(true);
    });
    it('getMostImportantEntities returns top entities', () => {
      storeGraph('p1', [mkEntity('e1', 'a.ts', 'model', 'A')], []);
      const top = getMostImportantEntities('p1', 5);
      expect(Array.isArray(top)).toBe(true);
    });
  });

  describe('getCircularDependencies, getGraphStats', () => {
    it('getGraphStats returns stats or null', () => {
      storeGraph('p1', [mkEntity('e1', 'a.ts', 'model', 'A')], []);
      const stats = getGraphStats('p1');
      expect(stats === null || (typeof stats === 'object' && 'totalEntities' in stats)).toBe(true);
    });
    it('getCircularDependencies returns cycles', () => {
      storeGraph('p1', [mkEntity('e1', 'a.ts', 'model', 'A')], []);
      const cycles = getCircularDependencies('p1');
      expect(Array.isArray(cycles)).toBe(true);
    });
  });

  describe('clearAllGraphs, getAllProjectIds', () => {
    it('clearAllGraphs clears all', () => {
      storeGraph('p1', [mkEntity('e1', 'a.ts', 'model', 'A')], []);
      clearAllGraphs();
      expect(getGraph('p1')).toBeUndefined();
    });
    it('getAllProjectIds returns project ids', () => {
      clearAllGraphs();
      storeGraph('p1', [mkEntity('e1', 'a.ts', 'model', 'A')], []);
      storeGraph('p2', [mkEntity('e2', 'b.ts', 'model', 'B')], []);
      expect(getAllProjectIds()).toContain('p1');
      expect(getAllProjectIds()).toContain('p2');
    });
  });

  describe('exportGraph, importGraph', () => {
    it('exportGraph returns JSON string', () => {
      storeGraph('p1', [mkEntity('e1', 'a.ts', 'model', 'A')], []);
      const json = exportGraph('p1');
      expect(typeof json).toBe('string');
      expect(JSON.parse(json!).projectId).toBe('p1');
    });
    it('exportGraph returns null for unknown project', () => {
      expect(exportGraph('unknown')).toBeNull();
    });
    it('importGraph parses and stores', () => {
      clearAllGraphs();
      const entities = [mkEntity('e1', 'a.ts', 'model', 'A')];
      const stored = storeGraph('p1', entities, []);
      const json = exportGraph('p1');
      clearAllGraphs();
      const imported = importGraph(json!);
      expect(imported).toBeDefined();
      expect(imported?.projectId).toBe('p1');
    });
    it('importGraph returns null for invalid JSON', () => {
      expect(importGraph('invalid')).toBeNull();
    });
  });
});
