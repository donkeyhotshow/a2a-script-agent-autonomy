/**
 * Graph package unit tests
 */
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { createGraph, GraphBuilder, GraphManager, GraphSearcher } = require('../src/index.js');

describe('@a2a/graph', () => {
  let tempDir;
  let graphConfig;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `a2a-graph-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    graphConfig = {
      projectPath: tempDir,
      storagePath: path.join(tempDir, '.a2a', 'graph.json'),
    };
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (_) {}
  });

  describe('createGraph', () => {
    it('returns builder, searcher, manager', () => {
      const { builder, searcher, manager } = createGraph(graphConfig);
      expect(builder).toBeInstanceOf(GraphBuilder);
      expect(searcher).toBeInstanceOf(GraphSearcher);
      expect(manager).toBeInstanceOf(GraphManager);
    });
  });

  describe('GraphManager', () => {
    it('getData returns empty when no file', async () => {
      const manager = new GraphManager(graphConfig);
      const data = await manager.getData();
      expect(data).toEqual({ nodes: [], edges: [] });
    });

    it('save and getData roundtrip', async () => {
      const manager = new GraphManager(graphConfig);
      const testData = {
        nodes: [{ id: 'a', type: 'php' }, { id: 'b', type: 'js' }],
        edges: [{ from: 'a', to: 'b', type: 'uses' }],
      };
      await manager.save(testData);
      const loaded = await manager.getData();
      expect(loaded.nodes).toHaveLength(2);
      expect(loaded.edges).toHaveLength(1);
      expect(loaded.timestamp).toBeDefined();
    });

    it('getPath returns storage path', () => {
      const manager = new GraphManager(graphConfig);
      expect(manager.getPath()).toBe(graphConfig.storagePath);
    });

    it('export to dot format', async () => {
      const manager = new GraphManager(graphConfig);
      await manager.save({
        nodes: [{ id: 'test.php', type: 'php' }],
        edges: [],
      });
      const dot = await manager.export('dot');
      expect(dot).toContain('digraph KnowledgeGraph');
      expect(dot).toContain('test.php');
    });

    it('export to csv format', async () => {
      const manager = new GraphManager(graphConfig);
      await manager.save({
        nodes: [{ id: 'a', type: 'php' }],
        edges: [{ from: 'a', to: 'b', type: 'uses' }],
      });
      const csv = await manager.export('csv');
      expect(csv).toContain('Type: Nodes');
      expect(csv).toContain('Type: Edges');
    });
  });

  describe('GraphBuilder', () => {
    it('getFileType returns correct types', () => {
      const manager = new GraphManager(graphConfig);
      const builder = new GraphBuilder({ projectPath: tempDir }, manager);
      expect(builder.getFileType('app/Http/Controllers/UserController.php')).toBe('controller');
      expect(builder.getFileType('app/Models/User.php')).toBe('model');
      expect(builder.getFileType('app.js')).toBe('js');
      expect(builder.getFileType('Component.vue')).toBe('vue');
      expect(builder.getFileType('config.json')).toBe('config');
    });

    it('extractDependencies parses PHP use statements', () => {
      const manager = new GraphManager(graphConfig);
      const builder = new GraphBuilder({ projectPath: tempDir }, manager);
      const content = `<?php
use App\\Models\\User;
use App\\Http\\Controllers\\Controller;
class AuthController extends Controller {}`;
      const deps = builder.extractDependencies(content, '.php', 'AuthController.php');
      expect(deps.some((d) => d.target === 'User' && d.type === 'uses')).toBe(true);
      expect(deps.some((d) => d.target === 'Controller' && d.type === 'extends')).toBe(true);
    });

    it('extractDependencies parses JS imports', () => {
      const manager = new GraphManager(graphConfig);
      const builder = new GraphBuilder({ projectPath: tempDir }, manager);
      const content = `import { foo } from './utils';
const bar = require('./bar');`;
      const deps = builder.extractDependencies(content, '.js', 'index.js');
      expect(deps.some((d) => d.target === './utils' && d.type === 'imports')).toBe(true);
      expect(deps.some((d) => d.target === './bar' && d.type === 'requires')).toBe(true);
    });

    it('build creates graph from project', async () => {
      await fs.writeFile(path.join(tempDir, 'test.php'), '<?php class Test {}');
      const manager = new GraphManager(graphConfig);
      const builder = new GraphBuilder({ projectPath: tempDir }, manager);
      const result = await builder.build();
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.nodes.some((n) => n.id === 'test.php')).toBe(true);
    });
  });
});
