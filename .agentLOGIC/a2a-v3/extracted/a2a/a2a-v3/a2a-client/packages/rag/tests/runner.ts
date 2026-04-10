/**
 * @fileoverview Test runner for RAG testing infrastructure
 * @module @a2a/rag/tests/runner
 * 
 * Orchestrates test execution including:
 * - Test data generation
 * - RAG instance initialization
 * - Test suite execution
 * - Performance metrics collection
 * - Report generation
 * 
 * @example
 * ```typescript
 * const runner = new RAGTestRunner();
 * await runner.initialize();
 * const report = await runner.runAll();
 * ```
 */

import fs from 'fs/promises';
import path from 'path';
import {
  TestDataGenerator,
  generateTestData,
} from '../test-data/generator.js';
import {
  getAllQueries,
  getQueriesByCategory,
  getQueriesByMatchType,
} from '../test-data/queries.js';
import {
  loadConfig,
  getConfigByPreset,
  ensureTestDirectories,
  DEFAULT_CONFIG,
} from './config.js';
import {
  createRAG,
  type RAGInstance,
  type SearchResult,
} from '../src/index.js';
import type {
  TestConfig,
  TestResult,
  TestReport,
  TestRunnerOptions,
  PerformanceMetrics,
  AccuracyMetrics,
  TestCase,
  TestDataset,
} from './types.js';

/**
 * RAG Test Runner - Main orchestrator for test execution
 */
export class RAGTestRunner {
  private config: TestConfig;
  private options: TestRunnerOptions;
  private rag: RAGInstance | null = null;
  private dataset: TestDataset | null = null;
  private results: TestResult[] = [];
  private performanceMetrics: PerformanceMetrics;
  private accuracyMetrics: AccuracyMetrics;
  private startTime: number = 0;

  constructor(
    configOrPreset: TestConfig | 'default' | 'performance' | 'smoke' | 'stress' = 'default',
    options: TestRunnerOptions = {}
  ) {
    if (typeof configOrPreset === 'string') {
      this.config = getConfigByPreset(configOrPreset);
    } else {
      this.config = loadConfig(configOrPreset);
    }
    this.options = {
      verbose: false,
      generateReport: true,
      ...options,
    };

    // Initialize metrics
    this.performanceMetrics = this.createEmptyPerformanceMetrics();
    this.accuracyMetrics = this.createEmptyAccuracyMetrics();
  }

  /**
   * Create empty performance metrics object
   */
  private createEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      totalTimeMs: 0,
      avgSearchTimeMs: 0,
      minSearchTimeMs: Infinity,
      maxSearchTimeMs: 0,
      p95SearchTimeMs: 0,
      memoryUsageMb: 0,
      peakMemoryMb: 0,
      concurrentSearches: 0,
    };
  }

  /**
   * Create empty accuracy metrics object
   */
  private createEmptyAccuracyMetrics(): AccuracyMetrics {
    return {
      precision: 0,
      recall: 0,
      f1Score: 0,
      mapAtK: 0,
      ndcg: 0,
      mrr: 0,
      zeroResultQueries: 0,
      avgResultCount: 0,
    };
  }

  /**
   * Initialize the test runner
   * - Creates necessary directories
   * - Generates test data
   * - Initializes RAG instance
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing RAG Test Runner...');
    this.startTime = Date.now();

    // Ensure directories exist
    await ensureTestDirectories(this.config);

    // Generate test data
    await this.generateTestData();

    // Initialize RAG
    await this.initializeRAG();

    const initTime = Date.now() - this.startTime;
    console.log(`✅ Initialization complete in ${initTime}ms`);
  }

  /**
   * Generate test data if needed
   */
  private async generateTestData(): Promise<void> {
    console.log('📊 Generating test data...');

    const generator = new TestDataGenerator({
      outputDir: this.config.outputDir,
      fileTypes: ['typescript', 'javascript', 'php', 'vue', 'markdown'],
      filesPerType: this.config.dataGeneration.filesPerType,
      avgLinesPerFile: this.config.dataGeneration.avgFileSizeLines,
      complexity: this.config.dataGeneration.varyComplexity ? 3 : 2,
      seed: 12345, // Fixed seed for reproducibility
    });

    this.dataset = await generator.generateAll();

    console.log(
      `✅ Generated ${this.dataset.files.length} test files`
    );
  }

  /**
   * Initialize RAG instance with test data
   */
  private async initializeRAG(): Promise<void> {
    console.log('🔧 Initializing RAG instance...');

    const initialMemory = process.memoryUsage();

    this.rag = createRAG({
      projectPath: this.config.outputDir,
      useTFIDF: this.config.search.useTFIDF,
      useBM25: this.config.search.useBM25,
      includePatterns: ['**/*.ts', '**/*.js', '**/*.php', '**/*.vue', '**/*.md'],
    });

    // Index the test data
    const indexStart = Date.now();
    await this.rag.indexer.indexProject(true);
    const indexTime = Date.now() - indexStart;

    // Load index into searcher
    await this.rag.searcher.loadIndex();

    // Build TF-IDF index if enabled
    if (this.config.search.useTFIDF) {
      await this.rag.searcher.buildTFIDFIndex();
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);

    this.performanceMetrics.indexBuildTimeMs = indexTime;
    this.performanceMetrics.memoryUsageMb = memoryIncrease;
    this.performanceMetrics.documentsIndexed = this.dataset?.files.length ?? 0;

    console.log(`✅ RAG initialized in ${indexTime}ms`);
    console.log(`   📁 Indexed ${this.dataset?.files.length ?? 0} files`);
    console.log(`   💾 Memory usage: ${memoryIncrease.toFixed(2)} MB`);
  }

  /**
   * Run all tests
   * @returns Test report with results
   */
  async runAll(): Promise<TestReport> {
    console.log('\n🏃 Running all tests...\n');

    this.results = [];
    const searchTimes: number[] = [];

    // Get queries based on options
    const queries = this.getQueriesToRun();
    console.log(`📋 Running ${queries.length} test queries\n`);

    for (const testCase of queries) {
      const result = await this.runTestCase(testCase);
      this.results.push(result);
      
      if (result.durationMs) {
        searchTimes.push(result.durationMs);
      }

      if (this.options.verbose) {
        this.logTestResult(result);
      }
    }

    // Calculate metrics
    this.calculatePerformanceMetrics(searchTimes);
    this.calculateAccuracyMetrics();

    // Generate report
    const report = this.generateReport();

    if (this.options.generateReport) {
      await this.saveReport(report);
    }

    this.printSummary(report);

    return report;
  }

  /**
   * Get queries to run based on options
   */
  private getQueriesToRun(): TestCase[] {
    let queries = getAllQueries();

    // Filter by categories
    if (this.options.categories && this.options.categories.length > 0) {
      queries = queries.filter(q => this.options.categories?.includes(q.category));
    }

    // Filter by match types
    if (this.options.matchTypes && this.options.matchTypes.length > 0) {
      queries = queries.filter(q => this.options.matchTypes?.includes(q.matchType));
    }

    // Skip performance tests if requested
    if (this.options.skipPerformance) {
      queries = queries.filter(q => q.category !== 'performance');
    }

    // Skip edge cases if requested
    if (this.options.skipEdgeCases) {
      queries = queries.filter(q => q.category !== 'edge-case');
    }

    return queries;
  }

  /**
   * Run a single test case
   */
  private async runTestCase(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Handle edge cases
      if (testCase.expectError) {
        return await this.runErrorTest(testCase, startTime);
      }

      // Perform search
      const searchStart = Date.now();
      const results = await this.performSearch(testCase.query, testCase.maxDurationMs);
      const searchTime = Date.now() - searchStart;

      // Calculate metrics
      const actualDocs = results.map(r => r.chunk.filePath);
      const expectedDocs = testCase.expectedDocs ?? [];
      const relevantRetrieved = actualDocs.filter(id => expectedDocs.includes(id));
      
      const precision = expectedDocs.length > 0
        ? relevantRetrieved.length / actualDocs.length
        : 0;
      const recall = expectedDocs.length > 0
        ? relevantRetrieved.length / expectedDocs.length
        : 0;
      const f1Score = precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;

      // Check performance threshold
      const passedPerformance = testCase.maxDurationMs
        ? searchTime <= testCase.maxDurationMs
        : searchTime <= this.config.thresholds.searchTimeMs;

      // Check accuracy threshold
      const minPrecision = testCase.minPrecision ?? this.config.thresholds.accuracyThreshold;
      const passedAccuracy = expectedDocs.length === 0 || precision >= minPrecision;

      return {
        id: testCase.id,
        name: testCase.name,
        category: testCase.category,
        passed: passedPerformance && passedAccuracy,
        durationMs: searchTime,
        results,
        expectedDocs,
        actualDocs,
        precision,
        recall,
        f1Score,
      };
    } catch (error) {
      return {
        id: testCase.id,
        name: testCase.name,
        category: testCase.category,
        passed: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run a test that expects an error
   */
  private async runErrorTest(
    testCase: TestCase,
    startTime: number
  ): Promise<TestResult> {
    try {
      await this.performSearch(testCase.query);
      
      return {
        id: testCase.id,
        name: testCase.name,
        category: testCase.category,
        passed: false,
        durationMs: Date.now() - startTime,
        error: 'Expected error but search succeeded',
      };
    } catch (error) {
      return {
        id: testCase.id,
        name: testCase.name,
        category: testCase.category,
        passed: true,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Perform search using RAG
   */
  private async performSearch(
    query: string,
    limit?: number
  ): Promise<SearchResult[]> {
    if (!this.rag) {
      throw new Error('RAG not initialized');
    }

    const options = {
      limit: limit ?? this.config.search.defaultLimit,
    };

    // Use hybrid search for better results
    const results = await this.rag.searcher.hybridSearch(query, options);
    
    return results;
  }

  /**
   * Calculate performance metrics from search times
   */
  private calculatePerformanceMetrics(searchTimes: number[]): void {
    if (searchTimes.length === 0) return;

    const sorted = [...searchTimes].sort((a, b) => a - b);
    const total = searchTimes.reduce((a, b) => a + b, 0);

    this.performanceMetrics = {
      ...this.performanceMetrics,
      totalTimeMs: total,
      avgSearchTimeMs: total / searchTimes.length,
      minSearchTimeMs: sorted[0],
      maxSearchTimeMs: sorted[sorted.length - 1],
      p95SearchTimeMs: sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1],
    };
  }

  /**
   * Calculate accuracy metrics from results
   */
  private calculateAccuracyMetrics(): void {
    const resultsWithMetrics = this.results.filter(r => r.precision !== undefined);
    
    if (resultsWithMetrics.length === 0) return;

    const totalPrecision = resultsWithMetrics.reduce((sum, r) => sum + (r.precision ?? 0), 0);
    const totalRecall = resultsWithMetrics.reduce((sum, r) => sum + (r.recall ?? 0), 0);
    const totalF1 = resultsWithMetrics.reduce((sum, r) => sum + (r.f1Score ?? 0), 0);

    const zeroResults = this.results.filter(r => 
      r.results && r.results.length === 0
    ).length;

    const avgResults = this.results.reduce((sum, r) => 
      sum + (r.results?.length ?? 0), 0
    ) / this.results.length;

    this.accuracyMetrics = {
      precision: totalPrecision / resultsWithMetrics.length,
      recall: totalRecall / resultsWithMetrics.length,
      f1Score: totalF1 / resultsWithMetrics.length,
      mapAtK: totalPrecision / resultsWithMetrics.length, // Simplified MAP
      ndcg: totalPrecision / resultsWithMetrics.length, // Simplified NDCG
      mrr: 0, // Would need ranking position calculation
      zeroResultQueries: zeroResults,
      avgResultCount: avgResults,
    };
  }

  /**
   * Generate test report
   */
  private generateReport(): TestReport {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped: 0,
        passRate: this.results.length > 0 ? passed / this.results.length : 0,
      },
      results: this.results,
      performance: this.performanceMetrics,
      accuracy: this.accuracyMetrics,
      durationMs: Date.now() - this.startTime,
    };
  }

  /**
   * Save report to file
   */
  private async saveReport(report: TestReport): Promise<void> {
    const reportPath = this.options.reportPath ?? path.join(
      this.config.testDataDir,
      'reports',
      `test-report-${Date.now()}.json`
    );

    await fs.mkdir(path.dirname(reportPath), {recursive: true});
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log(`\n📝 Report saved to: ${reportPath}`);
  }

  /**
   * Log test result to console
   */
  private logTestResult(result: TestResult): void {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name} (${result.durationMs}ms)`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.precision !== undefined) {
      console.log(`   Precision: ${result.precision.toFixed(3)}, Recall: ${result.recall?.toFixed(3)}`);
    }
  }

  /**
   * Print summary to console
   */
  private printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`📈 Pass Rate: ${(report.summary.passRate * 100).toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${report.durationMs}ms`);
    console.log('\n📊 PERFORMANCE METRICS');
    console.log(`   Avg Search Time: ${report.performance.avgSearchTimeMs.toFixed(2)}ms`);
    console.log(`   Min Search Time: ${report.performance.minSearchTimeMs.toFixed(2)}ms`);
    console.log(`   Max Search Time: ${report.performance.maxSearchTimeMs.toFixed(2)}ms`);
    console.log(`   P95 Search Time: ${report.performance.p95SearchTimeMs.toFixed(2)}ms`);
    console.log(`   Memory Usage: ${report.performance.memoryUsageMb.toFixed(2)} MB`);
    console.log('\n📊 ACCURACY METRICS');
    console.log(`   Precision: ${report.accuracy.precision.toFixed(3)}`);
    console.log(`   Recall: ${report.accuracy.recall.toFixed(3)}`);
    console.log(`   F1 Score: ${report.accuracy.f1Score.toFixed(3)}`);
    console.log('='.repeat(50));
  }

  /**
   * Run specific test suite
   */
  async runSuite(suiteName: 'functional' | 'performance' | 'accuracy' | 'edge-cases'): Promise<TestReport> {
    const categoryMap: Record<string, string[]> = {
      functional: ['functional'],
      performance: ['performance'],
      accuracy: ['accuracy'],
      'edge-cases': ['edge-case'],
    };

    this.options.categories = categoryMap[suiteName];
    return this.runAll();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    // RAG cleanup if needed
    this.rag = null;
    this.dataset = null;
    this.results = [];
    console.log('✅ Cleanup complete');
  }
}

/**
 * Quick test run function
 * @param options - Runner options
 * @returns Test report
 * @example
 * ```typescript
 * const report = await runTests({ verbose: true });
 * console.log(`Pass rate: ${report.summary.passRate}`);
 * ```
 */
export async function runTests(
  options: TestRunnerOptions = {}
): Promise<TestReport> {
  const runner = new RAGTestRunner('default', options);
  
  try {
    await runner.initialize();
    return await runner.runAll();
  } finally {
    await runner.cleanup();
  }
}

/**
 * Run tests with specific preset
 * @param preset - Configuration preset
 * @param options - Runner options
 * @returns Test report
 */
export async function runTestsWithPreset(
  preset: 'default' | 'performance' | 'smoke' | 'stress',
  options: TestRunnerOptions = {}
): Promise<TestReport> {
  const runner = new RAGTestRunner(preset, options);
  
  try {
    await runner.initialize();
    return await runner.runAll();
  } finally {
    await runner.cleanup();
  }
}

/**
 * Run performance benchmarks only
 * @param options - Runner options
 * @returns Test report
 */
export async function runPerformanceBenchmarks(
  options: TestRunnerOptions = {}
): Promise<TestReport> {
  const runner = new RAGTestRunner('performance', {
    ...options,
    categories: ['performance'],
  });
  
  try {
    await runner.initialize();
    return await runner.runAll();
  } finally {
    await runner.cleanup();
  }
}

export default RAGTestRunner;
