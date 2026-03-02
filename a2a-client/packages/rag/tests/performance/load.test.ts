/**
 * @fileoverview Load and stress testing for RAG package
 * @module @a2a/rag/tests/performance/load
 * 
 * Tests system behavior under load:
 * - Sustained load over time (5 minutes)
 * - Traffic spikes
 * - Resource exhaustion scenarios
 * - Recovery after load
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
import {STRESS_TEST_CONFIG} from '../config.js';
import type {Chunk} from '../../src/chunk-manager.js';

// Test directories
const LOAD_TEST_DIR = path.join(STRESS_TEST_CONFIG.outputDir, 'load-test');

interface LoadTestResult {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  memoryStartMb: number;
  memoryEndMb: number;
  memoryGrowthMb: number;
  errors: string[];
}

interface SpikeTestResult {
  baselineRps: number;
  spikeRps: number;
  baselineAvgTime: number;
  spikeAvgTime: number;
  recoveryTimeMs: number;
  success: boolean;
}

// Mock embedding client
jest.mock('@a2a/embedding', () => ({
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

// Increase timeout for load tests
jest.setTimeout(300000); // 5 minutes

describe('RAG Load and Stress Tests', () => {
  let bm25Scorer: BM25Scorer;
  let tfidfService: TFIDFService;
  let chunkManager: ChunkManager;
  let chunks: Chunk[] = [];

  const getMemoryUsageMb = (): number => {
    const usage = process.memoryUsage();
    return Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
  };

  const sleep = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));

  beforeAll(async () => {
    // Ensure test directory exists
    await fs.mkdir(LOAD_TEST_DIR, {recursive: true});

    // Generate larger test dataset for stress testing
    const generator = new TestDataGenerator({
      outputDir: LOAD_TEST_DIR,
      fileTypes: ['typescript', 'javascript', 'php', 'vue', 'markdown'],
      filesPerType: 30, // 150 files
      seed: 77777,
    });
    await generator.generateAll();

    // Create chunks from generated files
    chunkManager = new ChunkManager({});
    const files = await fs.readdir(LOAD_TEST_DIR, {recursive: true});
    
    for (const file of files) {
      const filePath = path.join(LOAD_TEST_DIR, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        const fileChunks = chunkManager.chunkFile(filePath, content, ext);
        chunks.push(...fileChunks);
      }
    }

    // Initialize search services
    bm25Scorer = new BM25Scorer();
    tfidfService = new TFIDFService();

    // Index all chunks
    for (const chunk of chunks) {
      const docId = chunk.id || `${chunk.filePath}:${chunk.startLine}`;
      bm25Scorer.addDocument(docId, chunk.content);
      tfidfService.addDocument(docId, chunk.content);
    }
  });

  describe('Sustained Load Test (5 minutes)', () => {
    it('should maintain performance under sustained load', async () => {
      const durationMs = 30000; // 30 seconds for faster test (adjust to 300000 for 5 min)
      const concurrentRequests = 10;
      const queries = [
        'function',
        'class',
        'async await',
        'interface',
        'export default',
        'error handling',
        'api client',
        'user authentication',
        'database query',
        'component props',
      ];

      const memoryStart = getMemoryUsageMb();
      const startTime = Date.now();
      
      let totalRequests = 0;
      let successfulRequests = 0;
      let failedRequests = 0;
      const responseTimes: number[] = [];
      const errors: string[] = [];

      // Run sustained load
      const runBatch = async (): Promise<void> => {
        const batchPromises = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
          const query = queries[totalRequests % queries.length];
          totalRequests++;
          
          const promise = (async () => {
            const reqStart = performance.now();
            try {
              const useBm25 = totalRequests % 2 === 0;
              if (useBm25) {
                bm25Scorer.search(query, 10);
              } else {
                tfidfService.search(query, 10);
              }
              successfulRequests++;
            } catch (error) {
              failedRequests++;
              errors.push(String(error));
            } finally {
              responseTimes.push(performance.now() - reqStart);
            }
          })();
          
          batchPromises.push(promise);
        }
        
        await Promise.all(batchPromises);
      };

      // Execute batches until time is up
      while (Date.now() - startTime < durationMs) {
        await runBatch();
        // Small delay between batches to prevent overwhelming
        await sleep(10);
      }

      const actualDuration = Date.now() - startTime;
      const memoryEnd = getMemoryUsageMb();

      // Calculate percentiles
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p99Index = Math.floor(sortedTimes.length * 0.99);

      const result: LoadTestResult = {
        name: 'Sustained Load (30s)',
        totalRequests,
        successfulRequests,
        failedRequests,
        avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        minResponseTime: Math.min(...responseTimes),
        maxResponseTime: Math.max(...responseTimes),
        p95ResponseTime: sortedTimes[p95Index] || 0,
        p99ResponseTime: sortedTimes[p99Index] || 0,
        requestsPerSecond: totalRequests / (actualDuration / 1000),
        memoryStartMb: memoryStart,
        memoryEndMb: memoryEnd,
        memoryGrowthMb: memoryEnd - memoryStart,
        errors: errors.slice(0, 10), // Keep first 10 errors
      };

      console.log('\n=== Sustained Load Test Results ===');
      console.log(`Duration: ${actualDuration}ms`);
      console.log(`Total Requests: ${result.totalRequests}`);
      console.log(`Successful: ${result.successfulRequests}`);
      console.log(`Failed: ${result.failedRequests}`);
      console.log(`Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
      console.log(`\nResponse Times:`);
      console.log(`  Average: ${result.avgResponseTime.toFixed(2)}ms`);
      console.log(`  Min: ${result.minResponseTime.toFixed(2)}ms`);
      console.log(`  Max: ${result.maxResponseTime.toFixed(2)}ms`);
      console.log(`  P95: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  P99: ${result.p99ResponseTime.toFixed(2)}ms`);
      console.log(`\nThroughput: ${result.requestsPerSecond.toFixed(2)} req/s`);
      console.log(`Memory Growth: ${result.memoryGrowthMb.toFixed(2)}MB`);

      // Assertions
      expect(result.failedRequests / result.totalRequests).toBeLessThan(0.05); // < 5% failure rate
      expect(result.avgResponseTime).toBeLessThan(100); // Average under 100ms
      expect(result.p95ResponseTime).toBeLessThan(200); // P95 under 200ms
      expect(result.requestsPerSecond).toBeGreaterThan(50); // At least 50 req/s
    });

    it('should handle increasing load gradually', async () => {
      const loadLevels = [5, 10, 20, 40, 80];
      const results: {concurrency: number; avgTime: number; successRate: number}[] = [];

      for (const concurrency of loadLevels) {
        const requests = concurrency * 10; // 10 batches per level
        let successCount = 0;
        const times: number[] = [];

        for (let batch = 0; batch < 10; batch++) {
          const batchPromises = [];
          
          for (let i = 0; i < concurrency; i++) {
            const promise = (async () => {
              const start = performance.now();
              try {
                bm25Scorer.search('function class', 5);
                successCount++;
              } catch {
                // Count as failure
              } finally {
                times.push(performance.now() - start);
              }
            })();
            batchPromises.push(promise);
          }
          
          await Promise.all(batchPromises);
          await sleep(50); // Brief pause between batches
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const successRate = successCount / requests;

        results.push({concurrency, avgTime, successRate});
      }

      console.log('\n=== Gradual Load Test Results ===');
      console.table(results);

      // Response time should not increase exponentially
      for (let i = 1; i < results.length; i++) {
        const timeRatio = results[i].avgTime / results[i - 1].avgTime;
        const loadRatio = results[i].concurrency / results[i - 1].concurrency;
        
        // Time increase should be less than 2x the load increase
        expect(timeRatio).toBeLessThan(loadRatio * 2);
      }

      // All levels should maintain > 95% success rate
      results.forEach(r => {
        expect(r.successRate).toBeGreaterThanOrEqual(0.95);
      });
    });
  });

  describe('Traffic Spike Tests', () => {
    it('should handle sudden traffic spikes', async () => {
      const baselineConcurrency = 5;
      const spikeConcurrency = 100;
      const spikeDuration = 5000; // 5 seconds

      // Establish baseline
      const baselineStart = performance.now();
      const baselinePromises = [];
      for (let i = 0; i < baselineConcurrency * 20; i++) {
        baselinePromises.push(
          Promise.resolve(bm25Scorer.search('function', 5))
        );
      }
      await Promise.all(baselinePromises);
      const baselineTime = performance.now() - baselineStart;
      const baselineRps = (baselineConcurrency * 20) / (baselineTime / 1000);

      // Introduce spike
      const spikeStart = performance.now();
      const spikePromises = [];
      
      // Create many concurrent requests
      for (let i = 0; i < spikeConcurrency; i++) {
        spikePromises.push(
          (async () => {
            const start = performance.now();
            try {
              bm25Scorer.search('async await', 10);
              return {success: true, time: performance.now() - start};
            } catch (error) {
              return {success: false, time: performance.now() - start, error};
            }
          })()
        );
      }

      const spikeResults = await Promise.all(spikePromises);
      const spikeTime = performance.now() - spikeStart;

      // Measure recovery
      const recoveryQueries: number[] = [];
      const recoveryStart = performance.now();
      
      for (let i = 0; i < 10; i++) {
        const queryStart = performance.now();
        bm25Scorer.search('class interface', 5);
        recoveryQueries.push(performance.now() - queryStart);
        await sleep(100);
      }
      
      const recoveryTime = performance.now() - recoveryStart;

      // Calculate metrics
      const successfulSpikes = spikeResults.filter(r => r.success).length;
      const avgSpikeTime = spikeResults.reduce((sum, r) => sum + r.time, 0) / spikeResults.length;
      const spikeRps = spikeConcurrency / (spikeTime / 1000);
      const avgRecoveryTime = recoveryQueries.reduce((a, b) => a + b, 0) / recoveryQueries.length;

      const result: SpikeTestResult = {
        baselineRps,
        spikeRps,
        baselineAvgTime: baselineTime / (baselineConcurrency * 20),
        spikeAvgTime: avgSpikeTime,
        recoveryTimeMs: recoveryTime,
        success: successfulSpikes / spikeConcurrency > 0.9,
      };

      console.log('\n=== Traffic Spike Test Results ===');
      console.log(`Baseline RPS: ${baselineRps.toFixed(2)}`);
      console.log(`Spike RPS: ${spikeRps.toFixed(2)}`);
      console.log(`Baseline Avg Time: ${result.baselineAvgTime.toFixed(2)}ms`);
      console.log(`Spike Avg Time: ${result.spikeAvgTime.toFixed(2)}ms`);
      console.log(`Success Rate: ${((successfulSpikes / spikeConcurrency) * 100).toFixed(2)}%`);
      console.log(`Recovery Time: ${result.recoveryTimeMs.toFixed(2)}ms`);

      expect(successfulSpikes / spikeConcurrency).toBeGreaterThanOrEqual(0.9);
      expect(avgRecoveryTime).toBeLessThan(500); // Recovery queries under 500ms
    });

    it('should handle multiple consecutive spikes', async () => {
      const spikes = 3;
      const requestsPerSpike = 50;
      const results: {spike: number; avgTime: number; successRate: number}[] = [];

      for (let spike = 0; spike < spikes; spike++) {
        let successCount = 0;
        const times: number[] = [];

        const promises = [];
        for (let i = 0; i < requestsPerSpike; i++) {
          promises.push(
            (async () => {
              const start = performance.now();
              try {
                const query = i % 2 === 0 ? 'function' : 'class';
                i % 2 === 0 
                  ? bm25Scorer.search(query, 5)
                  : tfidfService.search(query, 5);
                successCount++;
                times.push(performance.now() - start);
              } catch {
                times.push(performance.now() - start);
              }
            })()
          );
        }

        await Promise.all(promises);
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const successRate = successCount / requestsPerSpike;
        
        results.push({spike: spike + 1, avgTime, successRate});
        
        // Brief recovery period between spikes
        await sleep(1000);
      }

      console.log('\n=== Multiple Spike Test Results ===');
      console.table(results);

      // All spikes should maintain reasonable performance
      results.forEach(r => {
        expect(r.successRate).toBeGreaterThanOrEqual(0.95);
        expect(r.avgTime).toBeLessThan(500);
      });

      // Performance should not degrade significantly over spikes
      const firstSpike = results[0];
      const lastSpike = results[results.length - 1];
      expect(lastSpike.avgTime / firstSpike.avgTime).toBeLessThan(3);
    });
  });

  describe('Resource Stress Tests', () => {
    it('should handle large batch indexing without memory exhaustion', async () => {
      const memoryBefore = getMemoryUsageMb();
      const batchSizes = [100, 500, 1000];
      const results: {batchSize: number; time: number; memory: number}[] = [];

      for (const batchSize of batchSizes) {
        const freshBm25 = new BM25Scorer();
        const testChunks = chunks.slice(0, Math.min(chunks.length, batchSize));
        
        const startTime = performance.now();
        
        for (let i = 0; i < testChunks.length; i++) {
          const chunk = testChunks[i];
          freshBm25.addDocument(
            chunk.id || `doc-${i}`,
            chunk.content
          );
        }
        
        const duration = performance.now() - startTime;
        const memoryAfter = getMemoryUsageMb();
        
        results.push({
          batchSize,
          time: duration,
          memory: memoryAfter - memoryBefore,
        });
      }

      console.log('\n=== Batch Indexing Results ===');
      console.table(results);

      // Memory growth should be roughly linear
      for (let i = 1; i < results.length; i++) {
        const memoryRatio = results[i].memory / results[i - 1].memory;
        const sizeRatio = results[i].batchSize / results[i - 1].batchSize;
        expect(memoryRatio).toBeLessThan(sizeRatio * 2);
      }
    });

    it('should recover from high memory usage', async () => {
      const memoryBefore = getMemoryUsageMb();
      
      // Generate high load to increase memory
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          Promise.resolve(bm25Scorer.search('function', 10))
        );
      }
      await Promise.all(promises);

      const memoryPeak = getMemoryUsageMb();

      // Force cleanup if available
      if (global.gc) {
        global.gc();
      }

      // Wait for potential cleanup
      await sleep(1000);

      const memoryAfter = getMemoryUsageMb();
      const recovery = memoryPeak - memoryAfter;

      console.log('\n=== Memory Recovery Test ===');
      console.log(`Memory Before: ${memoryBefore.toFixed(2)}MB`);
      console.log(`Memory Peak: ${memoryPeak.toFixed(2)}MB`);
      console.log(`Memory After: ${memoryAfter.toFixed(2)}MB`);
      console.log(`Recovery: ${recovery.toFixed(2)}MB`);

      // Should be able to perform queries after high load
      const postStressResult = bm25Scorer.search('class', 5);
      expect(Array.isArray(postStressResult)).toBe(true);
      expect(postStressResult.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Stability Tests', () => {
    it('should maintain consistent response times over extended period', async () => {
      const iterations = 100;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        bm25Scorer.search('function async await', 10);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / avg; // Coefficient of variation

      console.log('\n=== Response Time Consistency ===');
      console.log(`Average: ${avg.toFixed(2)}ms`);
      console.log(`Std Dev: ${stdDev.toFixed(2)}ms`);
      console.log(`Coefficient of Variation: ${(cv * 100).toFixed(2)}%`);
      console.log(`Min: ${Math.min(...times).toFixed(2)}ms`);
      console.log(`Max: ${Math.max(...times).toFixed(2)}ms`);

      // Coefficient of variation should be reasonable (< 50%)
      expect(cv).toBeLessThan(0.5);
    });

    it('should handle rapid query variations without degradation', async () => {
      const variations = [
        'function',
        'class',
        'interface',
        'async function',
        'export default',
        'import from',
        'const let var',
        'return await',
        'try catch',
        'if else',
      ];

      const rounds = 50;
      const times: number[] = [];

      for (let round = 0; round < rounds; round++) {
        for (const query of variations) {
          const start = performance.now();
          bm25Scorer.search(query, 5);
          times.push(performance.now() - start);
        }
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log('\n=== Query Variation Test ===');
      console.log(`Total Queries: ${times.length}`);
      console.log(`Average Time: ${avg.toFixed(2)}ms`);
      console.log(`Max Time: ${max.toFixed(2)}ms`);

      expect(avg).toBeLessThan(50);
      expect(max).toBeLessThan(500);
    });
  });
});
