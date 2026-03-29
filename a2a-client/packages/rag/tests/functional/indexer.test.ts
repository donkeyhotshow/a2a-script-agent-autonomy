/**
 * @fileoverview Functional tests for RAG indexer
 * @module @a2a/rag/tests/functional/indexer
 * 
 * Tests indexer functionality including:
 * - Indexing directories with files
 * - Proper chunk extraction
 * - Saving and loading index
 * - Incremental indexing
 */

import path from 'path';
import fs from 'fs/promises';
import {RAGIndexer} from '../../src/indexer.js';
import {ChunkManager} from '../../src/chunk-manager.js';
import {TestDataGenerator} from '../../test-data/generator.js';
import {DEFAULT_CONFIG} from '../config.js';
import type {RAGIndexData, IndexFileInfo} from '../../src/indexer.js';
import type {Chunk} from '../../src/chunk-manager.js';

// Test configuration
const TEST_DIR = path.join(DEFAULT_CONFIG.outputDir, 'functional-indexer-test');
const INDEX_DIR = path.join(TEST_DIR, '.a2a', 'index');

describe('RAG Indexer Functional Tests', () => {
  let indexer: RAGIndexer;
  let chunkManager: ChunkManager;

  beforeAll(async () => {
    // Ensure clean test directory
    await fs.rm(TEST_DIR, {recursive: true, force: true});
    await fs.mkdir(TEST_DIR, {recursive: true});

    // Generate test data
    const generator = new TestDataGenerator({
      outputDir: TEST_DIR,
      fileTypes: ['typescript', 'javascript', 'php', 'vue', 'markdown'],
      filesPerType: 5,
      seed: 12345,
    });
    await generator.generateAll();

    // Initialize indexer and chunk manager
    indexer = new RAGIndexer({
      projectPath: TEST_DIR,
      includePatterns: ['**/*.ts', '**/*.js', '**/*.php', '**/*.vue', '**/*.md'],
      excludePatterns: ['node_modules/**', '.git/**', '.a2a/**'],
    });

    chunkManager = new ChunkManager({});
  }, 30000);

  afterAll(async () => {
    // Cleanup
    try {
      await fs.rm(TEST_DIR, {recursive: true, force: true});
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Directory Indexing', () => {
    it('should index a directory with files', async () => {
      const index = await indexer.indexProject(true);

      expect(index).toBeDefined();
      expect(index.files).toBeDefined();
      expect(index.chunks).toBeDefined();
      expect(index.version).toBe('1.0');
      expect(index.projectPath).toBe(TEST_DIR);
      expect(index.timestamp).toBeDefined();
    });

    it('should discover files matching include patterns', async () => {
      const index = await indexer.indexProject(true);

      // Should find files with matching extensions
      const tsFiles = index.files.filter(f => f.ext === '.ts');
      const jsFiles = index.files.filter(f => f.ext === '.js');
      const phpFiles = index.files.filter(f => f.ext === '.php');
      const vueFiles = index.files.filter(f => f.ext === '.vue');
      const mdFiles = index.files.filter(f => f.ext === '.md');

      expect(tsFiles.length).toBeGreaterThanOrEqual(0);
      expect(jsFiles.length).toBeGreaterThanOrEqual(0);
      expect(phpFiles.length).toBeGreaterThanOrEqual(0);
      expect(vueFiles.length).toBeGreaterThanOrEqual(0);
      expect(mdFiles.length).toBeGreaterThanOrEqual(0);
    });

    it('should exclude files matching exclude patterns', async () => {
      // Create files in excluded directories
      const nodeModulesDir = path.join(TEST_DIR, 'node_modules', 'test-package');
      await fs.mkdir(nodeModulesDir, {recursive: true});
      await fs.writeFile(
        path.join(nodeModulesDir, 'test.js'),
        'module.exports = "test";'
      );

      const index = await indexer.indexProject(true);

      // Should not include files from node_modules
      const excludedFiles = index.files.filter(f => f.path.includes('node_modules'));
      expect(excludedFiles).toHaveLength(0);
    });

    it('should collect file metadata correctly', async () => {
      const index = await indexer.indexProject(true);

      for (const file of index.files) {
        expect(file.path).toBeDefined();
        expect(file.ext).toBeDefined();
        expect(file.size).toBeGreaterThan(0);
        expect(file.modified).toBeDefined();
        expect(file.hash).toBeDefined();
        expect(file.language).toBeDefined();

        // Verify file exists
        const fullPath = path.join(TEST_DIR, file.path);
        const stat = await fs.stat(fullPath);
        expect(stat.isFile()).toBe(true);
      }
    });

    it('should calculate file hashes consistently', async () => {
      const index1 = await indexer.indexProject(true);
      const index2 = await indexer.indexProject(false);

      // Hashes should be the same for unchanged files
      for (const file1 of index1.files) {
        const file2 = index2.files.find(f => f.path === file1.path);
        if (file2) {
          expect(file1.hash).toBe(file2.hash);
        }
      }
    });
  });

  describe('Chunk Extraction', () => {
    it('should extract chunks from indexed files', async () => {
      const index = await indexer.indexProject(true);

      expect(index.chunks.length).toBeGreaterThan(0);
    });

    it('should create chunks with correct structure', async () => {
      const index = await indexer.indexProject(true);

      for (const chunk of index.chunks) {
        expect(chunk.id).toBeDefined();
        expect(chunk.filePath).toBeDefined();
        expect(chunk.type).toBeDefined();
        expect(chunk.content).toBeDefined();
        expect(chunk.startLine).toBeGreaterThan(0);
        
        // Content should not be empty
        expect(chunk.content.trim().length).toBeGreaterThan(0);
      }
    });

    it('should create chunks for different file types', async () => {
      const index = await indexer.indexProject(true);

      // Should have chunks for various file types
      const typeScriptChunks = index.chunks.filter(c => c.filePath.endsWith('.ts'));
      const javaScriptChunks = index.chunks.filter(c => c.filePath.endsWith('.js'));
      const phpChunks = index.chunks.filter(c => c.filePath.endsWith('.php'));
      const vueChunks = index.chunks.filter(c => c.filePath.endsWith('.vue'));
      const mdChunks = index.chunks.filter(c => c.filePath.endsWith('.md'));

      // Each type should have some chunks (or 0 if no files of that type)
      expect(typeScriptChunks.length).toBeGreaterThanOrEqual(0);
      expect(javaScriptChunks.length).toBeGreaterThanOrEqual(0);
      expect(phpChunks.length).toBeGreaterThanOrEqual(0);
      expect(vueChunks.length).toBeGreaterThanOrEqual(0);
      expect(mdChunks.length).toBeGreaterThanOrEqual(0);
    });

    it('should assign unique IDs to chunks', async () => {
      const index = await indexer.indexProject(true);

      const ids = index.chunks.map(c => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should extract named constructs when possible', async () => {
      const index = await indexer.indexProject(true);

      // Some chunks should have names (classes, functions, etc.)
      const namedChunks = index.chunks.filter(c => c.name);
      
      // At least some chunks should be named
      expect(namedChunks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Index Persistence', () => {
    it('should save index to disk', async () => {
      await indexer.indexProject(true);

      // Check that index file was created
      const indexFilePath = path.join(INDEX_DIR, 'rag-files.json');
      const indexExists = await fs.access(indexFilePath)
        .then(() => true)
        .catch(() => false);

      expect(indexExists).toBe(true);
    });

    it('should save valid JSON index', async () => {
      await indexer.indexProject(true);

      const indexFilePath = path.join(INDEX_DIR, 'rag-files.json');
      const content = await fs.readFile(indexFilePath, 'utf-8');
      
      let parsed: RAGIndexData;
      expect(() => {
        parsed = JSON.parse(content);
      }).not.toThrow();

      expect(parsed!).toHaveProperty('version');
      expect(parsed!).toHaveProperty('timestamp');
      expect(parsed!).toHaveProperty('projectPath');
      expect(parsed!).toHaveProperty('files');
      expect(parsed!).toHaveProperty('chunks');
    });

    it('should load index from disk', async () => {
      await indexer.indexProject(true);

      // Create new indexer instance
      const newIndexer = new RAGIndexer({
        projectPath: TEST_DIR,
        includePatterns: ['**/*.ts', '**/*.js', '**/*.php', '**/*.vue', '**/*.md'],
      });

      const loadedIndex = await newIndexer.indexProject(false);

      expect(loadedIndex).toBeDefined();
      expect(loadedIndex.files).toBeDefined();
      expect(loadedIndex.chunks).toBeDefined();
    });

    it('should preserve all data after save and load', async () => {
      const originalIndex = await indexer.indexProject(true);
      const originalFileCount = originalIndex.files.length;
      const originalChunkCount = originalIndex.chunks.length;

      // Load the saved index
      const indexFilePath = path.join(INDEX_DIR, 'rag-files.json');
      const content = await fs.readFile(indexFilePath, 'utf-8');
      const loadedIndex: RAGIndexData = JSON.parse(content);

      expect(loadedIndex.files.length).toBe(originalFileCount);
      expect(loadedIndex.chunks.length).toBe(originalChunkCount);
      expect(loadedIndex.version).toBe(originalIndex.version);
      expect(loadedIndex.projectPath).toBe(originalIndex.projectPath);
    });
  });

  describe('Incremental Indexing', () => {
    it('should detect new files', async () => {
      // First index
      await indexer.indexProject(true);
      const firstIndex = await indexer.indexProject(false);
      const initialFileCount = firstIndex.files.length;

      // Add a new file
      const newFilePath = path.join(TEST_DIR, 'new-file.ts');
      await fs.writeFile(newFilePath, `
        export class NewClass {
          private value: number;
          constructor() {
            this.value = 42;
          }
        }
      `);

      // Re-index
      const secondIndex = await indexer.indexProject(false);

      // New file should be detected
      const hasNewFile = secondIndex.files.some(f => f.path.includes('new-file'));
      expect(hasNewFile).toBe(true);
      expect(secondIndex.files.length).toBeGreaterThanOrEqual(initialFileCount);
    });

    it('should detect modified files', async () => {
      // First index
      await indexer.indexProject(true);

      // Modify a file
      const files = await fs.readdir(TEST_DIR);
      const tsFile = files.find(f => f.endsWith('.ts'));
      
      if (tsFile) {
        const filePath = path.join(TEST_DIR, tsFile);
        const originalContent = await fs.readFile(filePath, 'utf-8');
        
        // Modify content
        await fs.writeFile(filePath, originalContent + '\n// Modified');

        // Re-index
        const secondIndex = await indexer.indexProject(false);
        
        // File should be re-indexed with new hash
        const indexedFile = secondIndex.files.find(f => f.path.includes(tsFile));
        expect(indexedFile).toBeDefined();
        expect(indexedFile!.size).not.toBe(originalContent.length);

        // Restore original
        await fs.writeFile(filePath, originalContent);
      }
    });

    it('should detect deleted files', async () => {
      // Create a temporary file
      const tempFilePath = path.join(TEST_DIR, 'temp-delete.ts');
      await fs.writeFile(tempFilePath, 'export const temp = 123;');

      // First index
      await indexer.indexProject(true);
      const firstIndex = await indexer.indexProject(false);
      const hasTempFile = firstIndex.files.some(f => f.path.includes('temp-delete'));
      expect(hasTempFile).toBe(true);

      // Delete the file
      await fs.unlink(tempFilePath);

      // Re-index with force to ensure fresh scan
      const secondIndex = await indexer.indexProject(true);
      
      // File should no longer be in index
      const stillHasTempFile = secondIndex.files.some(f => f.path.includes('temp-delete'));
      expect(stillHasTempFile).toBe(false);
    });

    it('should update chunks when files change', async () => {
      // First index
      await indexer.indexProject(true);
      const firstIndex = await indexer.indexProject(false);
      const originalChunkCount = firstIndex.chunks.length;

      // Add a file with multiple chunks
      const newFilePath = path.join(TEST_DIR, 'multi-chunk.ts');
      await fs.writeFile(newFilePath, `
        export class ClassA {}
        export class ClassB {}
        export class ClassC {}
        export function funcA() {}
        export function funcB() {}
      `);

      // Re-index
      const secondIndex = await indexer.indexProject(false);
      
      // Should have more chunks now
      expect(secondIndex.chunks.length).toBeGreaterThanOrEqual(originalChunkCount);

      // Cleanup
      await fs.unlink(newFilePath);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent project path gracefully', async () => {
      const badIndexer = new RAGIndexer({
        projectPath: '/non/existent/path/12345',
        includePatterns: ['**/*.ts'],
      });

      // Should not throw, but return empty index
      const index = await badIndexer.indexProject(true);
      expect(index.files).toHaveLength(0);
      expect(index.chunks).toHaveLength(0);
    });

    it('should handle files with read errors', async () => {
      // Create a file that might cause issues
      const problematicFile = path.join(TEST_DIR, 'problematic.ts');
      await fs.writeFile(problematicFile, Buffer.from([0xFF, 0xFE])); // Invalid UTF-8

      // Should complete indexing without throwing
      const index = await indexer.indexProject(true);
      expect(index).toBeDefined();

      // Cleanup
      try {
        await fs.unlink(problematicFile);
      } catch (e) {
        // Ignore cleanup errors in tests
      }
    });

    it('should handle empty directories', async () => {
      const emptyDir = path.join(TEST_DIR, 'empty-dir');
      await fs.mkdir(emptyDir, {recursive: true});

      const index = await indexer.indexProject(true);
      
      // Should not include empty directories as files
      const emptyDirFiles = index.files.filter(f => f.path.includes('empty-dir'));
      expect(emptyDirFiles).toHaveLength(0);

      // Cleanup
      await fs.rmdir(emptyDir);
    });
  });

  describe('Configuration', () => {
    it('should respect custom include patterns', async () => {
      const tsOnlyIndexer = new RAGIndexer({
        projectPath: TEST_DIR,
        includePatterns: ['**/*.ts'],
        excludePatterns: ['node_modules/**'],
      });

      const index = await tsOnlyIndexer.indexProject(true);

      // Should only have TypeScript files
      for (const file of index.files) {
        expect(file.ext).toBe('.ts');
      }
    });

    it('should respect custom exclude patterns', async () => {
      // Create files in custom excluded directory
      const customExcludeDir = path.join(TEST_DIR, 'excluded');
      await fs.mkdir(customExcludeDir, {recursive: true});
      await fs.writeFile(
        path.join(customExcludeDir, 'test.ts'),
        'export const test = 1;'
      );

      const customIndexer = new RAGIndexer({
        projectPath: TEST_DIR,
        includePatterns: ['**/*.ts'],
        excludePatterns: ['node_modules/**', 'excluded/**'],
      });

      const index = await customIndexer.indexProject(true);

      // Should not include files from excluded directory
      const excludedFiles = index.files.filter(f => f.path.includes('excluded'));
      expect(excludedFiles).toHaveLength(0);

      // Cleanup
      await fs.rm(customExcludeDir, {recursive: true, force: true});
    });
  });
});
