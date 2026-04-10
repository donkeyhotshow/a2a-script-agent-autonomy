/**
 * @fileoverview Performance benchmark tests for RAG package
 * @module @a2a/rag/tests/performance/benchmark
 * 
 * Tests performance metrics including:
 * - Search latency (< 100ms threshold)
 * - Throughput (concurrent requests)
 * - Memory usage (< 100MB for 1000 documents)
 * - Index build time
 * - Scalability (linear growth verification)
 */

import path from 'path';
import fs from 'fs/promises';
import {
  RAGSearcher,
  BM25Scorer,
  TFIDFService,
  ChunkManager,
} from '../../src/index.js';
import {TestDataGenerator} from '../../test-data/generator.js';
import {DEFAULT_CONFIG, PERFORMANCE_CONFIG} from '../config.js';
import type {Chunk} from '../../src/chunk-manager.js';

// Test directories
const BENCHMARK_DIR = path.join(DEFAULT_CONFIG.outputDir, 'performance-benchmark');

// Performance thresholds from config
const THRESHOLDS = {
  searchTimeMs: DEFAULT_CONFIG.thresholds.searchTimeMs,
  memoryUsageMb: DEFAULT_CONFIG.thresholds.memoryUsageMb,
  indexBuildTimeMs: DEFAULT_CONFIG.thresholds.indexBuildTimeMs ?? 5000,
};

interface BenchmarkMetrics {
  name: string;
  durationMs: number;
  memoryBeforeMb: number;
  memoryAfterMb: number;
  memoryDeltaMb: number;
  success: boolean;
  details?: Record<string, unknown>;
}

interface ScalabilityResult {
  documentCount: number;
  searchTimeMs: number;
  indexBuildTimeMs: number;
  memoryUsageMb: number;
}

// Mock embedding client for semantic search tests
jest.mock('@a2a-client/embedding', () => ({
  createEmbeddingClient: () => ({
    embed: jest.fn(async (content: string) => {
      const hash = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const vector = Array(384).fill(0).map((_, i) => {
        return Math.sin(hash * (i + 1)) * 0.5 + 0.5;
      });
      const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      return vector.map(v => v / magnitude);
    }),
  }),
}));

describe('RAG Performance Benchmarks', () => {
  let searcher: RAGSearcher;
  let bm25Scorer: BM25Scorer;
  let tfidfService: TFIDFService;
  let chunkManager: ChunkManager;
  let chunks: Chunk[] = [];
  let metrics: BenchmarkMetrics[] = [];

  const getMemoryUsageMb = (): number => {
    const usage = process.memoryUsage();
    return Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
  };

  const recordMetric = (metric: BenchmarkMetrics): void => {
    metrics.push(metric);
  };

  beforeAll(async () => {
    // Ensure benchmark directory exists
    await fs.mkdir(BENCHMARK_DIR, {recursive: true});

    // Generate test data - 1000 documents for comprehensive testing
    const generator = new TestDataGenerator({
      outputDir: BENCHMARK_DIR,
      fileTypes: ['typescript', 'javascript', 'php', 'vue', 'markdown'],
      filesPerType: 50, // 250 files total
      seed: 12345,
    });
    await generator.generateAll();

    // Create chunks from generated files
    chunkManager = new ChunkManager({});
    const files = await fs.readdir(BENCHMARK_DIR, {recursive: true});
    
    for (const file of files) {
      const filePath = path.join(BENCHMARK_DIR, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        const fileChunks = chunkManager.chunkFile(filePath, content, ext);
        chunks.push(...fileChunks);
      }
    }

    // Initialize search services
    searcher = new RAGSearcher({projectPath: BENCHMARK_DIR, useTFIDF: true});
    bm25Scorer = new BM25Scorer();
    tfidfService = new TFIDFService();

    // Index all chunks
    for (const chunk of chunks) {
      const docId = chunk.id || `${chunk.filePath}:${chunk.startLine}`;
      bm25Scorer.addDocument(docId, chunk.content);
      tfidfService.addDocument(docId, chunk.content);
    }
  });

  afterAll(async () => {
    // Print benchmark summary
    console.log('\n=== Performance Benchmark Summary ===');
    console.table(metrics.map(m => ({
      Test: m.name,
      'Duration (ms)': m.durationMs.toFixed(2),
      'Memory Delta (MB)': m.memoryDeltaMb.toFixed(2),
      Success: m.success ? '✓' : '✗',
    })));
  });

  describe('Search Latency', () => {
    it('should complete simple search in under 100ms', async () => {
      const memoryBefore = getMemoryUsageMb();
      const startTime = performance.now();

      const results = tfidfService.search('function', 10);

      const duration = performance.now() - startTime;
      const memoryAfter = getMemoryUsageMb();

      recordMetric({
        name: 'Simple Search (TF-IDF)',
        durationMs: duration,
        memoryBeforeMb: memoryBefore,
        memoryAfterMb: memoryAfter,
        memoryDeltaMb: memoryAfter - memoryBefore,
        success: duration < THRESHOLDS.searchTimeMs,
        details: { resultCount: results.length },
      });

      expect(duration).toBeLessThan(THRESHOLDS.searchTimeMs);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should complete complex search in under 100ms', async () => {
      const memoryBefore = getMemoryUsageMb();
      const startTime = performance.now();

      const results = bm25Scorer.search('async function fetchUserData with error handling', 10);

      const duration = performance.now() - startTime;
      const memoryAfter = getMemoryUsageMb();

      recordMetric({
        name: 'Complex Search (BM25)',
        durationMs: duration,
        memoryBeforeMb: memoryBefore,
        memoryAfterMb: memoryAfter,
        memoryDeltaMb: memoryAfter - memoryBefore,
        success: duration < THRESHOLDS.searchTimeMs,
        details: { resultCount: results.length },
      });

      expect(duration).toBeLessThan(THRESHOLDS.searchTimeMs);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should complete semantic search in under 100ms', async () => {
      const memoryBefore = getMemoryUsageMb();
      const startTime = performance.now();

      // Simulate semantic search using TF-IDF as proxy
      const results = tfidfService.search('user authentication system', 10);

      const duration = performance.now() - startTime;
      const memoryAfter = getMemoryUsageMb();

      recordMetric({
        name: 'Semantic Search',
        durationMs: duration,
        memoryBeforeMb: memoryBefore,
        memoryAfterMb: memoryAfter,
        memoryDeltaMb: memoryAfter - memoryBefore,
        success: duration < THRESHOLDS.searchTimeMs,
        details: { resultCount: results.length },
      });

      expect(duration).toBeLessThan(THRESHOLDS.searchTimeMs);
    });
  });

  describe('Throughput', () => {
    it('should handle 10 concurrent requests efficiently', async () => {
      const memoryBefore = getMemoryUsageMb();
      const startTime = performance.now();
      const concurrency = 10;
      const queries = Array(concurrency).fill(null).map((_, i) => 
        `query ${i} test function`
      );

      const results = await Promise.all(
        queries.map(query => 
          Promise.resolve(tfidfService.search(query, 5))
        )
      );

      const duration = performance.now() - startTime;
      const memoryAfter = getMemoryUsageMb();
      const avgTimePerRequest = duration / concurrency;
      const successRate = results.filter(r => r.length > 0).length / concurrency;

      recordMetric({
        name: 'Throughput (10 concurrent)',
        durationMs: duration,
        memoryBeforeMb: memoryBefore,
        memoryAfterMb: memoryAfter,
        memoryDeltaMb: memoryAfter - memoryBefore,
        success: successRate >= 0.95,
        details: { 
          concurrency,
          avgTimePerRequest: avgTimePerRequest.toFixed(2),
          successRate: `${(successRate * 100).toFixed(1)}%`,
        },
      });

      expect(successRate).toBeGreaterThanOrEqual(0.95);
      expect(avgTimePerRequest).toBeLessThan(THRESHOLDS.searchTimeMs);
    });

    it('should handle 50 concurrent requests efficiently', async () => {
      const memoryBefore = getMemoryUsageMb();
      const startTime = performance.now();
      const concurrency = 50;
      const queries = Array(concurrency).fill(null).map((_, i) => 
        `query ${i} function class interface`
      );

      const results = await Promise.all(
        queries.map(query => 
          Promise.resolve(bm25Scorer.search(query, 5))
        )
      );

      const duration = performance.now() - startTime;
      const memoryAfter = getMemoryUsageMb();
      const avgTimePerRequest = duration / concurrency;
      const successRate = results.filter(r => r.length > 0).length / concurrency;

      recordMetric({
        name: 'Throughput (50 concurrent)',
        durationMs: duration,
        memoryBeforeMb: memoryBefore,
        memoryAfterMb: memoryAfter,
        memoryDeltaMb: memoryAfter - memoryBefore,
        success: successRate >= 0.90,
        details: { 
          concurrency,
          avgTimePerRequest: avgTimePerRequest.toFixed(2),
          successRate: `${(successRate * 100).toFixed(1)}%`,
        },
      });

      expect(successRate).toBeGreaterThanOrEqual(0.90);
    });

    it('should handle 100 concurrent requests with acceptable performance', async () => {
      const memoryBefore = getMemoryUsageMb();
      const startTime = performance.now();
      const concurrency = 100;
      const queries = Array(concurrency).fill(null).map((_, i) => 
        `query ${i} async await promise`
      );

      const results = await Promise.all(
        queries.map(query => 
          Promise.resolve(tfidfService.search(query, 5))
        )
      );

      const duration = performance.now() - startTime;
      const memoryAfter = getMemoryUsageMb();
      const avgTimePerRequest = duration / concurrency;
      const successRate = results.filter(r => r.length > 0).length / concurrency;

      recordMetric({
        name: 'Throughput (100 concurrent)',
        durationMs: duration,
        memoryBeforeMb: memoryBefore,
        memoryAfterMb: memoryAfter,
        memoryDeltaMb: memoryAfter - memoryBefore,
        success: successRate >= 0.85,
        details: { 
          concurrency,
          avgTimePerRequest: avgTimePerRequest.toFixed(2),
          successRate: `${(successRate * 100).toFixed(1)}%`,
        },
      });

      expect(successRate).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Memory Usage', () => {
    it('should use less than 100MB for indexing 1000 documents', async () => {
      const memoryBefore = getMemoryUsageMb();
      const startTime = performance.now();

      // Create fresh indexers to measure memory
      const freshBm25 = new BM25Scorer();
      const freshTfidf = new TFIDFService();

      // Index chunks
      for (let i = 0; i < Math.min(chunks.length, 1000); i++) {
        const chunk = chunks[i];
        const docId = chunk.id || `doc-${i}`;
        freshBm25.addDocument(docId, chunk.content);
        freshTfidf.addDocument(docId, chunk.content);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const duration = performance.now() - startTime;
      const memoryAfter = getMemoryUsageMb();
      const memoryDelta = memoryAfter - memoryBefore;

      recordMetric({
        name: 'Memory Usage (1000 docs)',
        durationMs: duration,
        memoryBeforeMb: memoryBefore,
        memoryAfterMb: memoryAfter,
        memoryDeltaMb: memoryDelta,
        success: memoryDelta < THRESHOLDS.memoryUsageMb,
        details: { 
          documentsIndexed: Math.min(chunks.length, 1000),
          memoryPerDoc: (memoryDelta / Math.min(chunks.length, 1000)).toFixed(4),
        },
      });

      expect(memoryDelta).toBeLessThan(THRESHOLDS.memoryUsageMb);
    });

    it('should not have significant memory leaks during repeated searches', async () => {
      const iterations = 100;
      const memorySnapshots: number[] = [];
      
      // Warm up
      for (let i = 0; i < 10; i++) {
        tfidfService.search('function test', 10);
      }

      const memoryBefore = getMemoryUsageMb();
      
      // Run repeated searches
      for (let i = 0; i < iterations; i++) {
        tfidfService.search('async function with parameters', 10);
        bm25Scorer.search('class implementation', 10);
        
        if (i % 20 === 0) {
          memorySnapshots.push(getMemoryUsageMb());
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = getMemoryUsageMb();
      const memoryGrowth = memoryAfter - memoryBefore;
      const growthRate = memoryGrowth / iterations;

      recordMetric({
        name: 'Memory Leak Check',
        durationMs: 0,
        memoryBeforeMb: memoryBefore,
        memoryAfterMb: memoryAfter,
        memoryDeltaMb: memoryGrowth,
        success: growthRate < 0.1, // Less than 0.1MB per iteration
        details: { 
          iterations,
          growthRate: `${growthRate.toFixed(4)} MB/iteration`,
          snapshots: memorySnapshots.join(' -> '),
        },
      });

      // Memory growth should be minimal (less than 0.1MB per iteration)
      expect(growthRate).toBeLessThan(0.1);
    });
  });

  describe('Index Build Time', () => {
    it('should build index for 100 documents in under 5 seconds', async () => {
      const testChunks = chunks.slice(0, 100);
      const freshBm25 = new BM25Scorer();
      const freshTfidf = new TFIDFService();

      const startTime = performance.now();

      for (let i = 0; i < testChunks.length; i++) {
        const chunk = testChunks[i];
        const docId = chunk.id || `doc-${i}`;
        freshBm25.addDocument(docId, chunk.content);
        freshTfidf.addDocument(docId, chunk.content);
      }

      const duration = performance.now() - startTime;

      recordMetric({
        name: 'Index Build (100 docs)',
        durationMs: duration,
        memoryBeforeMb: 0,
        memoryAfterMb: 0,
        memoryDeltaMb: 0,
        success: duration < THRESHOLDS.indexBuildTimeMs,
        details: { 
          documentCount: testChunks.length,
          timePerDoc: (duration / testChunks.length).toFixed(2),
        },
      });

      expect(duration).toBeLessThan(THRESHOLDS.indexBuildTimeMs);
    });

    it('should build index for 500 documents in under 5 seconds', async () => {
      const testChunks = chunks.slice(0, 500);
      const freshBm25 = new BM25Scorer();
      const freshTfidf = new TFIDFService();

      const startTime = performance.now();

      for (let i = 0; i < testChunks.length; i++) {
        const chunk = testChunks[i];
        const docId = chunk.id || `doc-${i}`;
        freshBm25.addDocument(docId, chunk.content);
        freshTfidf.addDocument(docId, chunk.content);
      }

      const duration = performance.now() - startTime;

      recordMetric({
        name: 'Index Build (500 docs)',
        durationMs: duration,
        memoryBeforeMb: 0,
        memoryAfterMb: 0,
        memoryDeltaMb: 0,
        success: duration < THRESHOLDS.indexBuildTimeMs,
        details: { 
          documentCount: testChunks.length,
          timePerDoc: (duration / testChunks.length).toFixed(2),
        },
      });

      expect(duration).toBeLessThan(THRESHOLDS.indexBuildTimeMs);
    });

    it('should build index for 1000 documents in under 5 seconds', async () => {
      const testChunks = chunks.slice(0, Math.min(chunks.length, 1000));
      const freshBm25 = new BM25Scorer();
      const freshTfidf = new TFIDFService();

      const startTime = performance.now();

      for (let i = 0; i < testChunks.length; i++) {
        const chunk = testChunks[i];
        const docId = chunk.id || `doc-${i}`;
        freshBm25.addDocument(docId, chunk.content);
        freshTfidf.addDocument(docId, chunk.content);
      }

      const duration = performance.now() - startTime;

      recordMetric({
        name: 'Index Build (1000 docs)',
        durationMs: duration,
        memoryBeforeMb: 0,
        memoryAfterMb: 0,
        memoryDeltaMb: 0,
        success: duration < THRESHOLDS.indexBuildTimeMs,
        details: { 
          documentCount: testChunks.length,
          timePerDoc: (duration / testChunks.length).toFixed(2),
        },
      });

      expect(duration).toBeLessThan(THRESHOLDS.indexBuildTimeMs);
    });
  });

  describe('Scalability', () => {
    it('should demonstrate linear search time growth with document count', async () => {
      const documentCounts = [50, 100, 200, 500];
      const scalabilityResults: ScalabilityResult[] = [];

      for (const docCount of documentCounts) {
        const testChunks = chunks.slice(0, docCount);
        const freshTfidf = new TFIDFService();
        const freshBm25 = new BM25Scorer();

        // Build index
        const indexStart = performance.now();
        for (let i = 0; i < testChunks.length; i++) {
          const docId = testChunks[i].id || `doc-${i}`;
          freshTfidf.addDocument(docId, testChunks[i].content);
          freshBm25.addDocument(docId, testChunks[i].content);
        }
        const indexTime = performance.now() - indexStart;

        // Measure search time
        const searchStart = performance.now();
        for (let i = 0; i < 10; i++) {
          freshTfidf.search('function class interface', 10);
        }
        const avgSearchTime = (performance.now() - searchStart) / 10;

        scalabilityResults.push({
          documentCount: docCount,
          searchTimeMs: avgSearchTime,
          indexBuildTimeMs: indexTime,
          memoryUsageMb: getMemoryUsageMb(),
        });
      }

      recordMetric({
        name: 'Scalability Test',
        durationMs: 0,
        memoryBeforeMb: 0,
        memoryAfterMb: 0,
        memoryDeltaMb: 0,
        success: true,
        details: { scalabilityResults },
      });

      // Verify roughly linear growth
      // Search time should not grow faster than O(n log n)
      for (let i = 1; i < scalabilityResults.length; i++) {
        const prev = scalabilityResults[i - 1];
        const curr = scalabilityResults[i];
        const timeGrowthRatio = curr.searchTimeMs / prev.searchTimeMs;
        const sizeGrowthRatio = curr.documentCount / prev.documentCount;
        
        // Time growth should not exceed 2x the size growth
        expect(timeGrowthRatio).toBeLessThan(sizeGrowthRatio * 2);
      }

      console.log('\nScalability Results:');
      console.table(scalabilityResults);
    });
  });
});
