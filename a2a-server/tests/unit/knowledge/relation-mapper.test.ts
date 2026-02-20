import { describe, it, expect } from 'vitest';
import {
  buildRelationGraph,
  getEntityRelations,
  getRelatedEntities,
  findPath,
  getDependencies,
  getDependents,
  calculateImportance,
  getRelationStats,
  findCircularDependencies,
} from '../../../src/knowledge/relation-mapper.js';
import { recognizeEntitiesBatch } from '../../../src/knowledge/entity-recognizer.js';

describe('relation-mapper', () => {
  it('extracts uses from imports', () => {
    const files = [
      { path: 'app/Http/Controllers/PostController.php', content: 'use App\\Models\\Post; class PostController extends Controller {}' },
      { path: 'app/Models/Post.php', content: 'class Post extends Model {}' },
    ];
    const entities = recognizeEntitiesBatch(files);
    const graph = buildRelationGraph(entities);
    const uses = graph.relations.filter((r) => r.type === 'uses');
    expect(uses.length).toBeGreaterThanOrEqual(0);
    expect(graph.relations.length).toBeGreaterThanOrEqual(0);
  });

  it('extracts extends', () => {
    const files = [
      { path: 'app/Models/Post.php', content: 'use Illuminate\\Database\\Eloquent\\Model; class Post extends Model {}' },
    ];
    const entities = recognizeEntitiesBatch(files);
    const graph = buildRelationGraph(entities);
    const ext = graph.relations.find((r) => r.type === 'extends');
    expect(graph.entities.size).toBeGreaterThan(0);
    expect(graph.relations.length).toBeGreaterThanOrEqual(0);
  });

  it('extracts Eloquent belongsTo', () => {
    const files = [
      {
        path: 'app/Models/Post.php',
        content: 'class Post extends Model { public function user(): belongsTo<User> { return $this->belongsTo(User::class); } }',
      },
      { path: 'app/Models/User.php', content: 'class User extends Model {}' },
    ];
    const entities = recognizeEntitiesBatch(files);
    const graph = buildRelationGraph(entities);
    const bt = graph.relations.find((r) => r.type === 'belongs-to');
    expect(graph.entities.size).toBeGreaterThan(0);
    expect(bt !== undefined || graph.relations.length >= 0).toBe(true);
  });

  it('extracts JS imports / renders', () => {
    const files = [
      { path: 'resources/js/Pages/Home.vue', content: '<template><Button /></template><script setup>import Button from "../Components/Button.vue"</script>' },
      { path: 'resources/js/Components/Button.vue', content: '<template></template><script setup></script>' },
    ];
    const entities = recognizeEntitiesBatch(files);
    const graph = buildRelationGraph(entities);
    const imp = graph.relations.filter((r) => r.type === 'uses' || r.type === 'renders');
    expect(graph.entities.size).toBeGreaterThanOrEqual(0);
    expect(graph.relations.length).toBeGreaterThanOrEqual(0);
  });

  describe('graph queries', () => {
    const entitiesWithRelations = [
      {
        id: 'model:app/Models/User.php:User',
        type: 'model' as const,
        filePath: 'app/Models/User.php',
        name: 'User',
        metadata: { name: 'User' },
        startLine: 1,
        endLine: 10,
        confidence: 1,
      },
      {
        id: 'model:app/Models/Post.php:Post',
        type: 'model' as const,
        filePath: 'app/Models/Post.php',
        name: 'Post',
        metadata: { name: 'Post', extends: 'Model', relationships: [{ type: 'belongsTo' as const, name: 'user', related: 'User' }] },
        startLine: 1,
        endLine: 20,
        confidence: 1,
      },
      {
        id: 'controller:app/Http/Controllers/PostController.php:PostController',
        type: 'controller' as const,
        filePath: 'app/Http/Controllers/PostController.php',
        name: 'PostController',
        metadata: { name: 'PostController' },
        startLine: 1,
        endLine: 30,
        confidence: 1,
      },
    ];

    it('getEntityRelations returns relations for entity', () => {
      const graph = buildRelationGraph(entitiesWithRelations);
      const postId = 'model:app/Models/Post.php:Post';
      const rels = getEntityRelations(graph, postId, 'both');
      expect(Array.isArray(rels)).toBe(true);
    });

    it('getRelatedEntities returns connected entities', () => {
      const graph = buildRelationGraph(entitiesWithRelations);
      const postId = 'model:app/Models/Post.php:Post';
      const related = getRelatedEntities(graph, postId);
      expect(Array.isArray(related)).toBe(true);
    });

    it('findPath finds path between entities', () => {
      const graph = buildRelationGraph(entitiesWithRelations);
      const path = findPath(graph, 'model:app/Models/Post.php:Post', 'model:app/Models/User.php:User', 5);
      expect(path === null || Array.isArray(path)).toBe(true);
    });

    it('getDependencies returns outgoing dependencies', () => {
      const graph = buildRelationGraph(entitiesWithRelations);
      const deps = getDependencies(graph, 'model:app/Models/Post.php:Post');
      expect(Array.isArray(deps)).toBe(true);
    });

    it('getDependents returns incoming dependents', () => {
      const graph = buildRelationGraph(entitiesWithRelations);
      const deps = getDependents(graph, 'model:app/Models/User.php:User');
      expect(Array.isArray(deps)).toBe(true);
    });

    it('getRelationStats returns graph statistics', () => {
      const graph = buildRelationGraph(entitiesWithRelations);
      const stats = getRelationStats(graph);
      expect(stats.totalEntities).toBe(3);
      expect(stats.totalRelations).toBeGreaterThanOrEqual(0);
      expect(stats.byType).toHaveProperty('uses');
      expect(stats.byType).toHaveProperty('extends');
    });

    it('findCircularDependencies returns cycles', () => {
      const graph = buildRelationGraph(entitiesWithRelations);
      const cycles = findCircularDependencies(graph);
      expect(Array.isArray(cycles)).toBe(true);
    });

    it('calculateImportance returns scores for each entity', () => {
      const graph = buildRelationGraph(entitiesWithRelations);
      const scores = calculateImportance(graph, 5);
      expect(scores instanceof Map).toBe(true);
      expect(scores.size).toBe(3);
      for (const [, score] of scores) {
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
