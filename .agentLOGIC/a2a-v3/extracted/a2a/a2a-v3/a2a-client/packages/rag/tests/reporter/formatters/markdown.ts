/**
 * Markdown Report Formatter
 * @module @a2a/rag/tests/reporter/formatters/markdown
 */

import type {
  TestReport,
  TestResult,
} from '../../types.js';

import {
  calculateCategorySummaries,
  generateRecommendations,
} from '../result-aggregator.js';

/**
 * Options for Markdown report generation
 */
export interface MarkdownReportOptions {
  /** Include recommendations section */
  includeRecommendations?: boolean;
  /** Include failed test details */
  includeFailedDetails?: boolean;
  /** Custom report title */
  title?: string;
  /** Version string */
  version?: string;
}

/** 
 * No local utils - delegated to utils/format-utils.ts
 */

/**
 * Generate Markdown report
 * 
 * @param report - Test report data
 * @param options - Report generation options
 * @returns Markdown formatted string
 */
export function generateMarkdownReport(
  report: TestReport,
  options: MarkdownReportOptions = {}
): string {
  const {
    includeRecommendations = true,
    includeFailedDetails = true,
    title = 'RAG Test Report',
    version = '1.0.0',
  } = options;
  
  const { summary, performance, accuracy, results, timestamp, durationMs, config } = report;
  const date = new Date(timestamp);
  const categories = calculateCategorySummaries(results);
  const failedTests = results.filter(r => !r.passed);
  
  let markdown = `# ${title}\n\n`;
  
  // Header section
  markdown += `**Generated:** ${date.toLocaleString()}\n\n`;
  markdown += `**Version:** ${version}\n\n`;
  markdown += `**Duration:** ${formatDuration(durationMs)}\n\n`;
  
  // Summary section
  markdown += `## 📊 Summary\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Tests | ${summary.total} |\n`;
  markdown += `| ✅ Passed | ${summary.passed} |\n`;
  markdown += `| ❌ Failed | ${summary.failed} |\n`;
  markdown += `| 📈 Pass Rate | ${formatPercentage(summary.passRate)} |\n`;
  markdown += `| ⏱️ Total Duration | ${formatDuration(durationMs)} |\n\n`;
  
  // Performance metrics section
  markdown += `## 🚀 Performance Metrics\n\n`;
  markdown += `| Metric | Value | Threshold | Status |\n`;
  markdown += `|--------|-------|-----------|--------|\n`;
  
  const avgTimeStatus = performance.avgSearchTimeMs <= report.config.thresholds.searchTimeMs;
  markdown += `| Average Search Time | ${performance.avgSearchTimeMs.toFixed(2)}ms | ${report.config.thresholds.searchTimeMs}ms | ${getStatusIcon(avgTimeStatus)} |\n`;
  
  markdown += `| Min Search Time | ${performance.minSearchTimeMs.toFixed(2)}ms | - | ✅ |\n`;
  markdown += `| Max Search Time | ${performance.maxSearchTimeMs.toFixed(2)}ms | - | ${getStatusIcon(performance.maxSearchTimeMs <= report.config.thresholds.searchTimeMs * 2)} |\n`;
  markdown += `| P95 Search Time | ${performance.p95SearchTimeMs.toFixed(2)}ms | - | - |\n`;
  
  const memoryStatus = performance.memoryUsageMb <= report.config.thresholds.memoryUsageMb;
  markdown += `| Memory Usage | ${performance.memoryUsageMb.toFixed(2)} MB | ${report.config.thresholds.memoryUsageMb} MB | ${getStatusIcon(memoryStatus)} |\n`;
  markdown += `| Peak Memory | ${performance.peakMemoryMb.toFixed(2)} MB | - | - |\n`;
  
  if (performance.indexBuildTimeMs) {
    const indexStatus = !report.config.thresholds.indexBuildTimeMs || 
      performance.indexBuildTimeMs <= (report.config.thresholds.indexBuildTimeMs ?? Infinity);
    markdown += `| Index Build Time | ${formatDuration(performance.indexBuildTimeMs)} | ${report.config.thresholds.indexBuildTimeMs ? formatDuration(report.config.thresholds.indexBuildTimeMs) : '-'} | ${getStatusIcon(indexStatus)} |\n`;
  }
  
  if (performance.documentsIndexed) {
    markdown += `| Documents Indexed | ${performance.documentsIndexed} | - | - |\n`;
  }
  
  if (performance.chunksIndexed) {
    markdown += `| Chunks Indexed | ${performance.chunksIndexed} | - | - |\n`;
  }
  
  markdown += `\n`;
  
  // Accuracy metrics section
  markdown += `## 🎯 Accuracy Metrics\n\n`;
  markdown += `| Metric | Value | Threshold | Status |\n`;
  markdown += `|--------|-------|-----------|--------|\n`;
  
  const precisionStatus = accuracy.precision >= report.config.thresholds.accuracyThreshold;
  markdown += `| Precision | ${accuracy.precision.toFixed(4)} | ${(report.config.thresholds.accuracyThreshold * 100).toFixed(0)}% | ${getStatusIcon(precisionStatus)} |\n`;
  
  const recallStatus = accuracy.recall >= report.config.thresholds.accuracyThreshold;
  markdown += `| Recall | ${accuracy.recall.toFixed(4)} | ${(report.config.thresholds.accuracyThreshold * 100).toFixed(0)}% | ${getStatusIcon(recallStatus)} |\n`;
  
  markdown += `| F1 Score | ${accuracy.f1Score.toFixed(4)} | - | - |\n`;
  markdown += `| MAP@K | ${accuracy.mapAtK.toFixed(4)} | - | - |\n`;
  markdown += `| NDCG | ${accuracy.ndcg.toFixed(4)} | - | - |\n`;
  markdown += `| MRR | ${accuracy.mrr.toFixed(4)} | - | - |\n`;
  markdown += `| Zero Result Queries | ${accuracy.zeroResultQueries} | - | - |\n`;
  markdown += `| Avg Result Count | ${accuracy.avgResultCount.toFixed(2)} | - | - |\n\n`;
  
  // Category breakdown
  markdown += `## 📁 Results by Category\n\n`;
  markdown += `| Category | Total | Passed | Failed | Pass Rate | Avg Duration |\n`;
  markdown += `|----------|-------|--------|--------|-----------|--------------|\n`;
  
  for (const category of categories) {
    const status = category.passRate >= report.config.thresholds.accuracyThreshold ? '✅' : '⚠️';
    markdown += `| ${category.name} | ${category.total} | ${category.passed} | ${category.failed} | ${status} ${formatPercentage(category.passRate)} | ${formatDuration(category.avgDuration)} |\n`;
  }
  
  markdown += `\n`;
  
  // Failed tests section
  if (includeFailedDetails && failedTests.length > 0) {
    markdown += `## ❌ Failed Tests\n\n`;
    markdown += `<details>\n<summary>Click to expand (${failedTests.length} failed tests)</summary>\n\n`;
    
    for (const test of failedTests) {
      markdown += `### ${test.name}\n\n`;
      markdown += `- **ID:** ${test.id}\n`;
      markdown += `- **Category:** ${test.category}\n`;
      markdown += `- **Duration:** ${formatDuration(test.durationMs)}\n`;
      
      if (test.error) {
        markdown += `- **Error:** \`${test.error}\`\n`;
      }
      
      if (test.precision !== undefined) {
        markdown += `- **Precision:** ${test.precision.toFixed(4)}\n`;
        markdown += `- **Recall:** ${(test.recall ?? 0).toFixed(4)}\n`;
        markdown += `- **F1 Score:** ${(test.f1Score ?? 0).toFixed(4)}\n`;
      }
      
      if (test.expectedDocs && test.actualDocs) {
        markdown += `- **Expected:** ${test.expectedDocs.join(', ')}\n`;
        markdown += `- **Actual:** ${test.actualDocs.join(', ')}\n`;
      }
      
      markdown += `\n`;
    }
    
    markdown += `</details>\n\n`;
  }
  
  // Recommendations section
  if (includeRecommendations) {
    markdown += `## 💡 Recommendations\n\n`;
    const recommendations = generateRecommendations(report);
    
    for (const rec of recommendations) {
      markdown += `- ${rec}\n`;
    }
    
    markdown += `\n`;
  }
  
  // Footer
  markdown += `---\n\n`;
  markdown += `*Report generated by RAG Test Suite*\n`;
  
  return markdown;
}

