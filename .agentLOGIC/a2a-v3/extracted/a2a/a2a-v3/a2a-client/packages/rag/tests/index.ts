/**
 * @fileoverview RAG Testing Infrastructure - Main Entry Point
 * @module @a2a/rag/tests
 * 
 * This is the main entry point for the RAG testing infrastructure.
 * It exports all testing components including:
 * - Test runner
 * - Test data generators
 * - Reporters (markdown, json, html, console)
 * - Visualizer
 * - Types and configuration
 * 
 * @example
 * ```typescript
 * // Import everything
 * import {
 *   RAGTestRunner,
 *   TestDataGenerator,
 *   generateMarkdownReport,
 *   generateHTMLReport,
 *   generateJSONReport,
 *   consoleReporter,
 *   visualizeReport,
 *   exportToCSV,
 *   loadConfig,
 *   DEFAULT_CONFIG,
 * } from '@a2a/rag/tests';
 * 
 * // Run tests and generate reports
 * const runner = new RAGTestRunner('default', { verbose: true });
 * await runner.initialize();
 * const report = await runner.runAll();
 * 
 * // Generate different report formats
 * const markdown = generateMarkdownReport(report);
 * const html = generateHTMLReport(report);
 * const json = generateJSONReport(report);
 * 
 * // Console output
 * consoleReporter(report, { verbose: true });
 * 
 * // Visualize metrics
 * const viz = visualizeReport(report);
 * console.log(viz);
 * 
 * // Export to CSV
 * const csv = exportToCSV(report);
 * ```
 */

// ========================================================================
// Test Runner
// ========================================================================

export { RAGTestRunner } from './runner.js';

// ========================================================================
// Test Data Generation
// ========================================================================

export { TestDataGenerator } from '../test-data/generator.js';
export {
  generateTestData,
  generateTestFiles,
  generateCodeFiles,
  generateQueries,
} from '../test-data/generator.js';

export {
  getAllQueries,
  getQueriesByCategory,
  getQueriesByMatchType,
  getFunctionalQueries,
  getPerformanceQueries,
  getAccuracyQueries,
  getEdgeCaseQueries,
} from '../test-data/queries.js';

// ========================================================================
// Reporters
// ========================================================================

export {
  generateMarkdownReport,
  generateJSONReport,
  generateHTMLReport,
  consoleReporter,
  saveReport,
  generateAllReports,
} from './reporter.js';

export type {
  MarkdownReportOptions,
  JSONReportOptions,
  HTMLReportOptions,
  ConsoleReporterOptions,
} from './reporter.js';

// ========================================================================
// Visualizer
// ========================================================================

export {
  visualizeReport,
  visualizePerformance,
  visualizeAccuracy,
  visualizeCategories,
  visualizeTimeline,
  visualizeComparison,
  exportToCSV,
  exportToJSONLines,
  sparkline,
} from './visualizer.js';

// ========================================================================
// Configuration
// ========================================================================

export {
  DEFAULT_CONFIG,
  PERFORMANCE_CONFIG,
  SMOKE_TEST_CONFIG,
  STRESS_TEST_CONFIG,
  loadConfig,
  getConfigByPreset,
  validateConfig,
  getTestPaths,
  ensureTestDirectories,
} from './config.js';

// ========================================================================
// Types
// ========================================================================

export type {
  // Core types
  TestResult,
  TestSuite,
  TestCase,
  TestReport,
  TestConfig,
  TestRunnerOptions,
  
  // Metrics
  PerformanceMetrics,
  AccuracyMetrics,
  
  // Data
  TestFile,
  TestDataset,
  CodeConstruct,
  
  // Enums
  FileType,
  MatchType,
} from './types.js';

// ========================================================================
// CLI Helpers
// ========================================================================

/**
 * Run tests with the specified preset
 * 
 * @param preset - Test configuration preset
 * @param options - Runner options
 * @returns Test report
 * 
 * @example
 * ```typescript
 * import { runTests } from '@a2a/rag/tests';
 * 
 * const report = await runTests('default', { verbose: true });
 * console.log(`Pass rate: ${report.summary.passRate * 100}%`);
 * ```
 */
export async function runTests(
  preset: 'default' | 'performance' | 'smoke' | 'stress' = 'default',
  options: {
    verbose?: boolean;
    generateReport?: boolean;
    categories?: string[];
    skipPerformance?: boolean;
    skipEdgeCases?: boolean;
  } = {}
): Promise<import('./types.js').TestReport> {
  const runner = new RAGTestRunner(preset, {
    verbose: options.verbose ?? false,
    generateReport: options.generateReport ?? true,
    skipPerformance: options.skipPerformance,
    skipEdgeCases: options.skipEdgeCases,
    categories: options.categories,
  });
  
  await runner.initialize();
  const report = await runner.runAll();
  await runner.cleanup();
  
  return report;
}

/**
 * Quick smoke test for fast validation
 * 
 * @returns Test report with minimal checks
 * 
 * @example
 * ```typescript
 * import { runSmokeTest } from '@a2a/rag/tests';
 * 
 * const report = await runSmokeTest();
 * if (report.summary.passRate < 0.8) {
 *   console.error('Smoke test failed!');
 * }
 * ```
 */
export async function runSmokeTest(): Promise<import('./types.js').TestReport> {
  return runTests('smoke', { verbose: true });
}

/**
 * Run performance benchmarks
 * 
 * @returns Test report with performance metrics
 * 
 * @example
 * ```typescript
 * import { runPerformanceTests } from '@a2a/rag/tests';
 * 
 * const report = await runPerformanceTests();
 * console.log(`Avg search time: ${report.performance.avgSearchTimeMs}ms`);
 * ```
 */
export async function runPerformanceTests(): Promise<import('./types.js').TestReport> {
  return runTests('performance', { verbose: true });
}

/**
 * Generate test data only
 * 
 * @param preset - Configuration preset
 * @returns Generated test dataset
 * 
 * @example
 * ```typescript
 * import { generateData, loadConfig } from '@a2a/rag/tests';
 * 
 * const config = loadConfig({ dataGeneration: { filesPerType: 20 } });
 * const dataset = await generateData(config);
 * console.log(`Generated ${dataset.files.length} files`);
 * ```
 */
export async function generateData(
  config?: Partial<import('./types.js').TestConfig>
): Promise<import('./types.js').TestDataset> {
  const cfg = loadConfig(config);
  const generator = new TestDataGenerator({
    outputDir: cfg.outputDir,
    fileTypes: ['typescript', 'javascript', 'php', 'vue', 'markdown'],
    filesPerType: cfg.dataGeneration.filesPerType,
    avgLinesPerFile: cfg.dataGeneration.avgFileSizeLines,
    complexity: cfg.dataGeneration.varyComplexity ? 3 : 2,
    seed: Date.now(),
  });
  
  return generator.generateAll();
}

/**
 * Analyze test results and provide insights
 * 
 * @param report - Test report to analyze
 * @returns Analysis object with insights
 * 
 * @example
 * ```typescript
 * import { runTests, analyzeResults } from '@a2a/rag/tests';
 * 
 * const report = await runTests();
 * const analysis = analyzeResults(report);
 * 
 * console.log(analysis.recommendations);
 * ```
 */
export function analyzeResults(
  report: import('./types.js').TestReport
): {
  passed: boolean;
  passRate: number;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  score: number;
} {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  const { summary, performance, accuracy, config } = report;
  
  // Check pass rate
  if (summary.passRate < 0.5) {
    criticalIssues.push(`Critical: Pass rate is only ${(summary.passRate * 100).toFixed(1)}%`);
    recommendations.push('Immediate investigation required - less than 50% pass rate');
  } else if (summary.passRate < 0.8) {
    warnings.push(`Pass rate is below target: ${(summary.passRate * 100).toFixed(1)}%`);
    recommendations.push('Review failed tests and consider adjusting thresholds');
  }
  
  // Check performance
  if (performance.avgSearchTimeMs > config.thresholds.searchTimeMs) {
    warnings.push(`Average search time (${performance.avgSearchTimeMs.toFixed(2)}ms) exceeds threshold`);
    recommendations.push('Optimize search algorithms or indexing strategy');
  }
  
  if (performance.p95SearchTimeMs > config.thresholds.searchTimeMs * 2) {
    warnings.push('P95 latency is significantly high');
    recommendations.push('Investigate slow query patterns');
  }
  
  if (performance.memoryUsageMb > config.thresholds.memoryUsageMb) {
    warnings.push(`Memory usage (${performance.memoryUsageMb.toFixed(2)}MB) exceeds threshold`);
    recommendations.push('Optimize memory usage or increase limit');
  }
  
  // Check accuracy
  if (accuracy.precision < config.thresholds.accuracyThreshold) {
    warnings.push(`Precision (${(accuracy.precision * 100).toFixed(1)}%) below threshold`);
    recommendations.push('Improve ranking algorithm or query understanding');
  }
  
  if (accuracy.recall < config.thresholds.accuracyThreshold) {
    warnings.push(`Recall (${(accuracy.recall * 100).toFixed(1)}%) below threshold`);
    recommendations.push('Expand index coverage or adjust similarity thresholds');
  }
  
  if (accuracy.zeroResultQueries > summary.total * 0.1) {
    warnings.push(`${accuracy.zeroResultQueries} queries returned no results`);
    recommendations.push('Implement query expansion or fallback strategies');
  }
  
  // Calculate overall score (0-100)
  const passRateScore = summary.passRate * 30;
  const perfScore = Math.max(0, 30 - (performance.avgSearchTimeMs / config.thresholds.searchTimeMs) * 30);
  const accScore = (accuracy.precision + accuracy.recall + accuracy.f1Score) / 3 * 40;
  
  const score = Math.min(100, Math.round(passRateScore + perfScore + accScore));
  
  return {
    passed: summary.passRate >= 0.8 && warnings.length === 0,
    passRate: summary.passRate,
    criticalIssues,
    warnings,
    recommendations,
    score,
  };
}

// ========================================================================
// Default export (for convenience)
// ========================================================================

/**
 * Default export provides quick access to all testing functionality
 */
export default {
  // Runner
  RAGTestRunner,
  runTests,
  runSmokeTest,
  runPerformanceTests,
  
  // Data
  TestDataGenerator,
  generateTestData,
  generateData,
  getAllQueries,
  
  // Reports
  generateMarkdownReport,
  generateJSONReport,
  generateHTMLReport,
  consoleReporter,
  saveReport,
  generateAllReports,
  
  // Visualization
  visualizeReport,
  exportToCSV,
  exportToJSONLines,
  
  // Analysis
  analyzeResults,
  
  // Config
  DEFAULT_CONFIG,
  PERFORMANCE_CONFIG,
  SMOKE_TEST_CONFIG,
  STRESS_TEST_CONFIG,
  loadConfig,
  getConfigByPreset,
  validateConfig,
};
