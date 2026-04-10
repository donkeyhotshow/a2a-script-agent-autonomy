/**
 * JSON Report Formatter
 * @module @a2a/rag/tests/reporter/formatters/json
 */

import type {TestReport} from '../../types.js';

import {
  calculateCategorySummaries,
} from '../result-aggregator.js';

/**
 * Options for JSON report generation
 */
export interface JSONReportOptions {
  /** Include full test results array */
  includeFullResults?: boolean;
  /** Pretty print JSON */
  pretty?: boolean;
  /** Include configuration */
  includeConfig?: boolean;
}

/**
 * Generate JSON report
 * 
 * @param report - Test report data
 * @param options - Report generation options
 * @returns JSON object 
 */
export function generateJSONReport(
  report: TestReport,
  options: JSONReportOptions = {}
): object {
  const {
    includeFullResults = true,
    includeConfig = true,
  } = options;
  
  const { summary, performance, accuracy, results, timestamp, durationMs, config } = report;
  const failedTests = results.filter(r => !r.passed);
  
  const jsonReport: Record<string, unknown> = {
    metadata: {
      timestamp,
      durationMs,
      generatedAt: new Date().toISOString(),
    },
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      skipped: summary.skipped,
      passRate: summary.passRate,
      passRatePercentage: parseFloat((summary.passRate * 100).toFixed(2)),
    },
    performance: {
      totalTimeMs: performance.totalTimeMs,
      avgSearchTimeMs: parseFloat(performance.avgSearchTimeMs.toFixed(4)),
      minSearchTimeMs: parseFloat(performance.minSearchTimeMs.toFixed(4)),
      maxSearchTimeMs: parseFloat(performance.maxSearchTimeMs.toFixed(4)),
      p95SearchTimeMs: parseFloat(performance.p95SearchTimeMs.toFixed(4)),
      memoryUsageMb: parseFloat(performance.memoryUsageMb.toFixed(4)),
      peakMemoryMb: parseFloat(performance.peakMemoryMb.toFixed(4)),
      concurrentSearches: performance.concurrentSearches,
      indexBuildTimeMs: performance.indexBuildTimeMs,
      documentsIndexed: performance.documentsIndexed,
      chunksIndexed: performance.chunksIndexed,
    },
    accuracy: {
      precision: parseFloat(accuracy.precision.toFixed(4)),
      recall: parseFloat(accuracy.recall.toFixed(4)),
      f1Score: parseFloat(accuracy.f1Score.toFixed(4)),
      mapAtK: parseFloat(accuracy.mapAtK.toFixed(4)),
      ndcg: parseFloat(accuracy.ndcg.toFixed(4)),
      mrr: parseFloat(accuracy.mrr.toFixed(4)),
      zeroResultQueries: accuracy.zeroResultQueries,
      avgResultCount: parseFloat(accuracy.avgResultCount.toFixed(4)),
    },
    categories: calculateCategorySummaries(results),
    failedTests: failedTests.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      durationMs: t.durationMs,
      error: t.error,
      precision: t.precision,
      recall: t.recall,
      f1Score: t.f1Score,
      expectedDocs: t.expectedDocs,
      actualDocs: t.actualDocs,
    })),
  };
  
  if (includeFullResults) {
    jsonReport.results = results.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      passed: r.passed,
      durationMs: r.durationMs,
      precision: r.precision,
      recall: r.recall,
      f1Score: r.f1Score,
      error: r.error,
    }));
  }
  
  if (includeConfig) {
    jsonReport.config = {
      testDataDir: config.testDataDir,
      outputDir: config.outputDir,
      thresholds: config.thresholds,
      search: config.search,
      dataGeneration: config.dataGeneration,
    };
  }
  
  return jsonReport;
}

