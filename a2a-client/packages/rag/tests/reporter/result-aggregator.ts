/**
 * @fileoverview Test result aggregation and analysis module
 * @module @a2a/rag/tests/reporter/result-aggregator
 * 
 * Handles aggregation of test results, calculation of metrics,
 * and generation of category summaries.
 */

import type {
  TestReport,
  TestResult,
  PerformanceMetrics,
  AccuracyMetrics,
  TestConfig,
} from '../types.js';

/**
 * Report category summary
 */
export interface CategorySummary {
  name: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  avgDuration: number;
}

/**
 * Aggregated test metrics
 */
export interface AggregatedMetrics {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
  };
  categories: CategorySummary[];
  failedTests: TestResult[];
  performance: PerformanceMetrics;
  accuracy: AccuracyMetrics;
}

/**
 * Calculate category summaries from test results
 */
export function calculateCategorySummaries(results: TestResult[]): CategorySummary[] {
  const categories = new Map<string, TestResult[]>();
  
  for (const result of results) {
    const existing = categories.get(result.category) ?? [];
    existing.push(result);
    categories.set(result.category, existing);
  }
  
  return Array.from(categories.entries())
    .map(([name, categoryResults]) => {
      const passed = categoryResults.filter(r => r.passed).length;
      const totalDuration = categoryResults.reduce((sum, r) => sum + r.durationMs, 0);
      
      return {
        name,
        total: categoryResults.length,
        passed,
        failed: categoryResults.length - passed,
        passRate: categoryResults.length > 0 ? passed / categoryResults.length : 0,
        avgDuration: totalDuration / categoryResults.length,
      };
    })
    .sort((a, b) => b.failed - a.failed);
}

/**
 * Aggregate test results into comprehensive metrics
 */
export function aggregateTestResults(
  results: TestResult[],
  config: TestConfig,
  performance: PerformanceMetrics,
  accuracy: AccuracyMetrics,
  durationMs: number,
  timestamp: string
): TestReport {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const skipped = results.filter(r => r.skipped).length;
  const passRate = total > 0 ? passed / total : 0;
  
  const categories = calculateCategorySummaries(results);
  const failedTests = results.filter(r => !r.passed);
  
  return {
    summary: {
      total,
      passed,
      failed,
      skipped,
      passRate,
    },
    performance,
    accuracy,
    results,
    categories,
    failedTests,
    config,
    timestamp,
    durationMs,
  };
}

/**
 * Calculate performance metrics from test results
 */
export function calculatePerformanceMetrics(results: TestResult[]): PerformanceMetrics {
  const durations = results.map(r => r.durationMs).sort((a, b) => a - b);
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  
  // Calculate percentiles
  const p50Index = Math.floor(durations.length * 0.5);
  const p95Index = Math.floor(durations.length * 0.95);
  
  return {
    totalTimeMs: totalDuration,
    avgSearchTimeMs: totalDuration / durations.length,
    minSearchTimeMs: durations[0] || 0,
    maxSearchTimeMs: durations[durations.length - 1] || 0,
    p95SearchTimeMs: durations[p95Index] || 0,
    memoryUsageMb: 0, // Will be set by memory monitoring
    peakMemoryMb: 0,  // Will be set by memory monitoring
    concurrentSearches: 1, // Default value
    indexBuildTimeMs: undefined,
    documentsIndexed: undefined,
    chunksIndexed: undefined,
  };
}

/**
 * Calculate accuracy metrics from test results
 */
export function calculateAccuracyMetrics(results: TestResult[]): AccuracyMetrics {
  const validResults = results.filter(r => r.precision !== undefined);
  
  if (validResults.length === 0) {
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
  
  const totalPrecision = validResults.reduce((sum, r) => sum + (r.precision ?? 0), 0);
  const totalRecall = validResults.reduce((sum, r) => sum + (r.recall ?? 0), 0);
  const totalF1 = validResults.reduce((sum, r) => sum + (r.f1Score ?? 0), 0);
  const totalMap = validResults.reduce((sum, r) => sum + (r.mapAtK ?? 0), 0);
  const totalNdcg = validResults.reduce((sum, r) => sum + (r.ndcg ?? 0), 0);
  const totalMrr = validResults.reduce((sum, r) => sum + (r.mrr ?? 0), 0);
  const totalResults = validResults.reduce((sum, r) => sum + (r.actualDocs?.length ?? 0), 0);
  
  const zeroResultQueries = validResults.filter(r => (r.actualDocs?.length ?? 0) === 0).length;
  
  return {
    precision: totalPrecision / validResults.length,
    recall: totalRecall / validResults.length,
    f1Score: totalF1 / validResults.length,
    mapAtK: totalMap / validResults.length,
    ndcg: totalNdcg / validResults.length,
    mrr: totalMrr / validResults.length,
    zeroResultQueries,
    avgResultCount: validResults.length > 0 ? totalResults / validResults.length : 0,
  };
}

/**
 * Generate recommendations based on test results
 */
export function generateRecommendations(report: TestReport): string[] {
  const recommendations: string[] = [];
  const { summary, performance, accuracy, config } = report;
  
  // Pass rate recommendations
  if (summary.passRate < 0.5) {
    recommendations.push('🚨 **Critical**: Pass rate is below 50%. Immediate investigation required.');
  } else if (summary.passRate < 0.8) {
    recommendations.push('⚠️ **Warning**: Pass rate is below 80%. Review failed tests and consider adjusting thresholds.');
  }
  
  // Performance recommendations
  if (performance.avgSearchTimeMs > config.thresholds.searchTimeMs) {
    recommendations.push(`⚠️ **Performance**: Average search time (${performance.avgSearchTimeMs.toFixed(2)}ms) exceeds threshold (${config.thresholds.searchTimeMs}ms). Consider:
    - Optimizing index structure
    - Reducing chunk size
    - Implementing caching`);
  }
  
  if (performance.p95SearchTimeMs > config.thresholds.searchTimeMs * 2) {
    recommendations.push(`⚠️ **Performance**: P95 search time (${performance.p95SearchTimeMs.toFixed(2)}ms) is significantly high. Review slow queries.`);
  }
  
  if (performance.memoryUsageMb > config.thresholds.memoryUsageMb) {
    recommendations.push(`⚠️ **Memory**: Memory usage (${performance.memoryUsageMb.toFixed(2)}MB) exceeds threshold (${config.thresholds.memoryUsageMb}MB). Consider:
    - Optimizing chunk storage
    - Implementing memory limits
    - Using streaming for large files`);
  }
  
  // Accuracy recommendations
  if (accuracy.precision < config.thresholds.accuracyThreshold) {
    recommendations.push(`⚠️ **Accuracy**: Precision (${accuracy.precision.toFixed(3)}) is below threshold (${config.thresholds.accuracyThreshold}). Consider:
    - Adjusting ranking weights
    - Improving query understanding
    - Adding relevance feedback`);
  }
  
  if (accuracy.recall < config.thresholds.accuracyThreshold) {
    recommendations.push(`⚠️ **Accuracy**: Recall (${accuracy.recall.toFixed(3)}) is below threshold (${config.thresholds.accuracyThreshold}). Consider:
    - Expanding index coverage
    - Adjusting similarity thresholds
    - Using hybrid search`);
  }
  
  if (accuracy.zeroResultQueries > report.summary.total * 0.1) {
    recommendations.push(`⚠️ **Coverage**: ${accuracy.zeroResultQueries} queries returned no results (>10%). Consider:
    - Expanding test data coverage
    - Implementing query expansion
    - Adding fallback search strategies`);
  }
  
  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('✅ All metrics are within acceptable thresholds. No immediate action required.');
  }
  
  return recommendations;
}

/**
 * Validate test results for consistency
 */
export function validateTestResults(results: TestResult[]): string[] {
  const errors: string[] = [];
  
  for (const result of results) {
    if (!result.id) {
      errors.push(`Test result missing ID: ${result.name}`);
    }
    
    if (!result.name) {
      errors.push(`Test result missing name: ${result.id}`);
    }
    
    if (!result.category) {
      errors.push(`Test result missing category: ${result.name}`);
    }
    
    if (result.durationMs < 0) {
      errors.push(`Test result has negative duration: ${result.name}`);
    }
    
    if (result.precision !== undefined && (result.precision < 0 || result.precision > 1)) {
      errors.push(`Test result has invalid precision: ${result.name} (${result.precision})`);
    }
    
    if (result.recall !== undefined && (result.recall < 0 || result.recall > 1)) {
      errors.push(`Test result has invalid recall: ${result.name} (${result.recall})`);
    }
  }
  
  return errors;
}

/**
 * Filter test results by category
 */
export function filterResultsByCategory(results: TestResult[], category: string): TestResult[] {
  return results.filter(r => r.category === category);
}

/**
 * Get test results by status
 */
export function getResultsByStatus(results: TestResult[], status: 'passed' | 'failed' | 'skipped'): TestResult[] {
  switch (status) {
    case 'passed':
      return results.filter(r => r.passed);
    case 'failed':
      return results.filter(r => !r.passed && !r.skipped);
    case 'skipped':
      return results.filter(r => r.skipped);
    default:
      return [];
  }
}

/**
 * Calculate trend metrics for multiple test runs
 */
export function calculateTrendMetrics(reports: TestReport[]): {
  passRateTrend: number[];
  avgDurationTrend: number[];
  failedCountTrend: number[];
} {
  return {
    passRateTrend: reports.map(r => r.summary.passRate),
    avgDurationTrend: reports.map(r => r.performance.avgSearchTimeMs),
    failedCountTrend: reports.map(r => r.summary.failed),
  };
}