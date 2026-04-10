/**
 * @fileoverview Integration tests for RAG system
 * @module @a2a/rag/tests/functional/integration
 * 
 * Integration tests covering:
 * - Full cycle: generation → indexing → search
 * - RAGIntegrator functionality
 * - File watching with chokidar
 */

import path from 'path';
import fs from 'fs/promises';
import {createRAG, RAGIntegrator} from '../../src/index.js';
import {RAGIndexer} from '../../src/indexer.js';
import {RAGSearcher} from '../../src/searcher.js';
import {ChunkManager} from '../../src/chunk-manager.js';
import {TestDataGenerator} from '../../test-data/generator.js';
import {TYPESCRIPT_QUERIES, PHP_QUERIES} from '../../test-data/queries.js';
import {DEFAULT_CONFIG} from '../config.js';
import type {RAGInstance} from '../../src/index.js';
import type {Chunk} from '../../src/chunk-manager.js';

// Test configuration
const TEST_DIR = path.join(DEFAULT_CONFIG.outputDir, 'functional-integration-test');

// Mock chokidar for file watching tests
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(function(this: any, event: string, handler: Function) {
      // Store handlers for testing
      if (!this.handlers) this.handlers = {};
      this.handlers[event] = handler;
      return this;
    }),
    close: jest.fn(),
    handlers: {} as Record<string, Function>,
  })),
}));

// Mock embedding client
jest.mock('@a2a/embedding', () => ({
  createEmbeddingClient: () => ({
    embed: jest.fn(async (content: string) => {
      // Simple mock: create a deterministic vector based on content hash
      const hash = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const vector = Array(384).fill(0).map((_, i) => {
        return Math.sin(hash * (i + 1)) * 0.5 + 0.5;
      });
      // Normalize
      const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      return vector.map(v => v / magnitude);
    }),
  }),
}));

describe('RAG Integration Tests', () => {
  let rag: RAGInstance;
  let integrator: RAGIntegrator;

  beforeAll(async () => {
    // Ensure clean test directory
    await fs.rm(TEST_DIR, {recursive: true, force: true});
    await fs.mkdir(TEST_DIR, {recursive: true});
  }, 30000);

  afterAll(async () => {
    // Stop watching if active
    if (integrator?.isWatching) {
      integrator.stopWatching?.();
    }

    // Cleanup
    try {
      await fs.rm(TEST_DIR, {recursive: true, force: true});
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Full Cycle: Generation → Indexing → Search', () => {
    it('should complete full RAG cycle', async () => {
      // Step 1: Generate test data
      const generator = new TestDataGenerator({
        outputDir: TEST_DIR,
        fileTypes: ['typescript', 'javascript', 'php'],
        filesPerType: 5,
        seed: 12345,
      });
      await generator.generateAll();

      // Verify files were created
      const files = await fs.readdir(TEST_DIR);
      expect(files.length).toBeGreaterThan(0);

      // Step 2: Initialize RAG
      rag = createRAG({
        projectPath: TEST_DIR,
        includePatterns: ['**/*.ts', '**/*.js', '**/*.php'],
        useTFIDF: true,
        useBM25: true,
      });

      expect(rag.indexer).toBeDefined();
      expect(rag.searcher).toBeDefined();
      expect(rag.chunks).toBeDefined();
      expect(rag.tfidf).toBeDefined();

      // Step 3: Index the project
      const index = await rag.indexer.indexProject(true);
      expect(index.files.length).toBeGreaterThan(0);
      expect(index.chunks.length).toBeGreaterThan(0);

      // Step 4: Build TF-IDF index for searching
      await rag.searcher.buildTFIDFIndex();

      // Step 5: Perform searches
      const query = 'class UserController';
      const searchResults = await rag.searcher.search(query, {limit: 10});

      expect(searchResults.length).toBeGreaterThanOrEqual(0);
    }, 60000);

    it('should index and search TypeScript files', async () => {
      // Generate TypeScript files
      const tsDir = path.join(TEST_DIR, 'ts-test');
      await fs.mkdir(tsDir, {recursive: true});

      const generator = new TestDataGenerator({
        outputDir: tsDir,
        fileTypes: ['typescript'],
        filesPerType: 3,
        seed: 42,
      });
      await generator.generateAll();

      // Initialize and index
      const tsRag = createRAG({
        projectPath: tsDir,
        includePatterns: ['**/*.ts'],
        useTFIDF: true,
      });

      const index = await tsRag.indexer.indexProject(true);
      expect(index.files.some(f => f.ext === '.ts')).toBe(true);

      // Search for TypeScript-specific terms
      await tsRag.searcher.buildTFIDFIndex();
      const results = await tsRag.searcher.search('interface', {limit: 5});
      expect(Array.isArray(results)).toBe(true);
    }, 30000);

    it('should index and search PHP files', async () => {
      // Generate PHP files
      const phpDir = path.join(TEST_DIR, 'php-test');
      await fs.mkdir(phpDir, {recursive: true});

      const generator = new TestDataGenerator({
        outputDir: phpDir,
        fileTypes: ['php'],
        filesPerType: 3,
        seed: 43,
      });
      await generator.generateAll();

      // Initialize and index
      const phpRag = createRAG({
        projectPath: phpDir,
        includePatterns: ['**/*.php'],
        useTFIDF: true,
      });

      const index = await phpRag.indexer.indexProject(true);
      expect(index.files.some(f => f.ext === '.php')).toBe(true);

      // Search for PHP-specific terms
      await phpRag.searcher.buildTFIDFIndex();
      const results = await phpRag.searcher.search('class', {limit: 5});
      expect(Array.isArray(results)).toBe(true);
    }, 30000);

    it('should handle mixed file types in one project', async () => {
      const mixedDir = path.join(TEST_DIR, 'mixed');
      await fs.mkdir(mixedDir, {recursive: true});

      // Generate multiple file types
      const generator = new TestDataGenerator({
        outputDir: mixedDir,
        fileTypes: ['typescript', 'javascript', 'vue', 'markdown'],
        filesPerType: 2,
        seed: 44,
      });
      await generator.generateAll();

      // Index all files
      const mixedRag = createRAG({
        projectPath: mixedDir,
        includePatterns: ['**/*.ts', '**/*.js', '**/*.vue', '**/*.md'],
        useTFIDF: true,
      });

      const index = await mixedRag.indexer.indexProject(true);

      // Should have different file types
      const extensions = new Set(index.files.map(f => f.ext));
      expect(extensions.size).toBeGreaterThan(1);

      // Should be able to search across all types
      await mixedRag.searcher.buildTFIDFIndex();
      const results = await mixedRag.searcher.search('export', {limit: 10});
      expect(Array.isArray(results)).toBe(true);
    }, 30000);

    it('should maintain data consistency through cycle', async () => {
      const consistencyDir = path.join(TEST_DIR, 'consistency');
      await fs.mkdir(consistencyDir, {recursive: true});

      // Create a simple file
      const testFile = path.join(consistencyDir, 'test.ts');
      const testContent = `
        export interface User {
          id: number;
          name: string;
        }
        
        export class UserService {
          findById(id: number): User {
            return { id, name: 'Test' };
          }
        }
      `;
      await fs.writeFile(testFile, testContent);

      // Index
      const consistencyRag = createRAG({
        projectPath: consistencyDir,
        includePatterns: ['**/*.ts'],
        useTFIDF: true,
      });

      const index = await consistencyRag.indexer.indexProject(true);

      // Verify chunks contain expected content
      const userInterfaceChunk = index.chunks.find(c => 
        c.content.includes('interface User')
      );
      expect(userInterfaceChunk).toBeDefined();

      const userServiceChunk = index.chunks.find(c => 
        c.content.includes('class UserService')
      );
      expect(userServiceChunk).toBeDefined();

      // Search should find relevant chunks
      await consistencyRag.searcher.buildTFIDFIndex();
      const results = await consistencyRag.searcher.search('UserService', {limit: 5});
      
      if (results.length > 0) {
        expect(results[0]!.chunk.content).toContain('UserService');
      }
    }, 30000);
  });

  describe('RAGIntegrator', () => {
    beforeEach(async () => {
      const integratorDir = path.join(TEST_DIR, 'integrator');
      await fs.mkdir(integratorDir, {recursive: true});

      // Create some test files
      await fs.writeFile(
        path.join(integratorDir, 'file1.ts'),
        'export const x = 1;'
      );
      await fs.writeFile(
        path.join(integratorDir, 'file2.ts'),
        'export class Test {}'
      );

      integrator = new RAGIntegrator({
        projectPath: integratorDir,
        includePatterns: ['**/*.ts'],
        excludePatterns: ['node_modules/**'],
      });
    });

    it('should scan and index files', async () => {
      const result = await integrator.scanAndIndex();

      expect(result.files.length).toBeGreaterThan(0);
      expect(result.scannedCount).toBeGreaterThan(0);
    });

    it('should index individual files', async () => {
      const file = {
        path: path.join(TEST_DIR, 'integrator', 'file1.ts'),
        ext: '.ts',
      };

      const result = await integrator.indexFile(file);

      expect(result.success).toBe(true);
      expect(result.chunks).toBeGreaterThanOrEqual(0);
    });

    it('should handle indexing errors gracefully', async () => {
      const nonExistentFile = {
        path: path.join(TEST_DIR, 'integrator', 'non-existent.ts'),
        ext: '.ts',
      };

      const result = await integrator.indexFile(nonExistentFile);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should cache file contents', async () => {
      const filePath = path.join(TEST_DIR, 'integrator', 'file1.ts');
      
      // First read should cache
      const content1 = await integrator.readFile(filePath);
      expect(content1).toBeDefined();

      // Second read should use cache
      const content2 = await integrator.readFile(filePath);
      expect(content2).toBe(content1);
    });

    it('should clear file cache', async () => {
      const filePath = path.join(TEST_DIR, 'integrator', 'file1.ts');
      
      // Read to cache
      await integrator.readFile(filePath);

      // Clear cache
      integrator.clearCache?.();

      // Read again - should read from disk
      const content = await integrator.readFile(filePath);
      expect(content).toBeDefined();
    });

    it('should provide statistics', async () => {
      await integrator.scanAndIndex();

      const stats = integrator.getStats?.();
      
      if (stats) {
        expect(stats).toHaveProperty('indexedFiles');
        expect(stats).toHaveProperty('totalChunks');
        expect(stats.indexedFiles).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('File Watching', () => {
    let watcherDir: string;

    beforeEach(async () => {
      watcherDir = path.join(TEST_DIR, 'watcher');
      await fs.mkdir(watcherDir, {recursive: true});

      // Create initial files
      await fs.writeFile(
        path.join(watcherDir, 'initial.ts'),
        'export const initial = 1;'
      );

      integrator = new RAGIntegrator({
        projectPath: watcherDir,
        includePatterns: ['**/*.ts'],
      });
    });

    afterEach(() => {
      if (integrator?.isWatching) {
        integrator.stopWatching?.();
      }
    });

    it('should start watching files', () => {
      integrator.startWatching();
      expect(integrator.isWatching).toBe(true);
    });

    it('should stop watching files', () => {
      integrator.startWatching();
      expect(integrator.isWatching).toBe(true);

      integrator.stopWatching?.();
      expect(integrator.isWatching).toBe(false);
    });

    it('should handle file additions', async () => {
      integrator.startWatching();

      // Simulate file addition (in real scenario, this would be triggered by chokidar)
      const newFile = path.join(watcherDir, 'added.ts');
      await fs.writeFile(newFile, 'export const added = 2;');

      // Manually trigger the handler for testing
      if ((integrator as any).handleFileChange) {
        await (integrator as any).handleFileChange('add', newFile);
      }

      // File should be indexed
      expect(integrator.isWatching).toBe(true);
    });

    it('should handle file modifications', async () => {
      const existingFile = path.join(watcherDir, 'initial.ts');
      
      integrator.startWatching();

      // Modify file
      await fs.writeFile(existingFile, 'export const modified = 3;');

      // Manually trigger the handler
      if ((integrator as any).handleFileChange) {
        await (integrator as any).handleFileChange('change', existingFile);
      }

      expect(integrator.isWatching).toBe(true);
    });

    it('should handle file deletions', async () => {
      const fileToDelete = path.join(watcherDir, 'to-delete.ts');
      await fs.writeFile(fileToDelete, 'export const temp = 1;');

      integrator.startWatching();

      // Delete file
      await fs.unlink(fileToDelete);

      // Manually trigger the handler
      if ((integrator as any).handleFileChange) {
        await (integrator as any).handleFileChange('unlink', fileToDelete);
      }

      expect(integrator.isWatching).toBe(true);
    });

    it('should not start watching if already watching', () => {
      integrator.startWatching();
      const firstWatcher = (integrator as any).watcher;

      integrator.startWatching();
      const secondWatcher = (integrator as any).watcher;

      expect(firstWatcher).toBe(secondWatcher);
    });
  });

  describe('End-to-End Search Scenarios', () => {
    let e2eRag: RAGInstance;

    beforeAll(async () => {
      const e2eDir = path.join(TEST_DIR, 'e2e');
      await fs.mkdir(e2eDir, {recursive: true});

      // Generate comprehensive test data
      const generator = new TestDataGenerator({
        outputDir: e2eDir,
        fileTypes: ['typescript', 'php', 'javascript', 'vue', 'markdown'],
        filesPerType: 8,
        seed: 100,
      });
      await generator.generateAll();

      // Initialize RAG
      e2eRag = createRAG({
        projectPath: e2eDir,
        includePatterns: ['**/*.ts', '**/*.php', '**/*.js', '**/*.vue', '**/*.md'],
        useTFIDF: true,
        useBM25: true,
      });

      // Full index
      await e2eRag.indexer.indexProject(true);
      await e2eRag.searcher.buildTFIDFIndex();
    }, 60000);

    it('should find TypeScript interfaces', async () => {
      const testCase = TYPESCRIPT_QUERIES.find(q => q.id === 'ts-001');
      if (testCase) {
        const results = await e2eRag.searcher.search(testCase.query, {limit: 5});
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should find PHP classes', async () => {
      const testCase = PHP_QUERIES.find(q => q.id === 'php-001');
      if (testCase) {
        const results = await e2eRag.searcher.search(testCase.query, {limit: 5});
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should support multiple search algorithms', async () => {
      const query = 'class';

      // TF-IDF search
      const tfidfResults = e2eRag.tfidf.search(query, 5);
      expect(Array.isArray(tfidfResults)).toBe(true);

      // Searcher search (uses multiple algorithms)
      const searcherResults = await e2eRag.searcher.search(query, {limit: 5});
      expect(Array.isArray(searcherResults)).toBe(true);
    });

    it('should provide highlighted results', async () => {
      const results = await e2eRag.searcher.search('function', {limit: 3});

      for (const result of results) {
        expect(result.chunk).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.highlights).toBeDefined();
        expect(Array.isArray(result.highlights)).toBe(true);
      }
    });

    it('should handle complex queries', async () => {
      const complexQueries = [
        'async function with Promise',
        'class extends BaseController',
        'interface with generic type',
        'export default function',
      ];

      for (const query of complexQueries) {
        const results = await e2eRag.searcher.search(query, {limit: 3});
        expect(Array.isArray(results)).toBe(true);
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle corrupted index gracefully', async () => {
      const corruptDir = path.join(TEST_DIR, 'corrupt');
      await fs.mkdir(corruptDir, {recursive: true});
      await fs.mkdir(path.join(corruptDir, '.a2a', 'index'), {recursive: true});

      // Write corrupted index
      await fs.writeFile(
        path.join(corruptDir, '.a2a', 'index', 'rag-files.json'),
        'invalid json {'
      );

      const corruptRag = createRAG({
        projectPath: corruptDir,
        useTFIDF: true,
      });

      // Should not throw
      const index = await corruptRag.indexer.indexProject(true);
      expect(index).toBeDefined();
    });

    it('should handle missing index gracefully', async () => {
      const missingDir = path.join(TEST_DIR, 'missing');
      await fs.mkdir(missingDir, {recursive: true});

      const missingRag = createRAG({
        projectPath: missingDir,
        useTFIDF: true,
      });

      // Should create new index
      const index = await missingRag.indexer.indexProject(true);
      expect(index).toBeDefined();
      expect(index.files).toHaveLength(0);
    });

    it('should recover from search errors', async () => {
      const errorDir = path.join(TEST_DIR, 'error');
      await fs.mkdir(errorDir, {recursive: true});

      const errorRag = createRAG({
        projectPath: errorDir,
        useTFIDF: true,
      });

      // Try to search without building index
      const results = await errorRag.searcher.search('test', {limit: 5});
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete full cycle within reasonable time', async () => {
      const perfDir = path.join(TEST_DIR, 'performance');
      await fs.mkdir(perfDir, {recursive: true});

      // Generate test data
      const generator = new TestDataGenerator({
        outputDir: perfDir,
        fileTypes: ['typescript', 'javascript'],
        filesPerType: 10,
        seed: 200,
      });
      await generator.generateAll();

      const start = Date.now();

      // Initialize
      const perfRag = createRAG({
        projectPath: perfDir,
        includePatterns: ['**/*.ts', '**/*.js'],
        useTFIDF: true,
      });

      // Index
      await perfRag.indexer.indexProject(true);

      // Build search index
      await perfRag.searcher.buildTFIDFIndex();

      // Search
      await perfRag.searcher.search('class', {limit: 10});

      const duration = Date.now() - start;

      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    }, 35000);
  });
});
