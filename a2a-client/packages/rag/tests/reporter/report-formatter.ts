/**
 * @fileoverview Report formatting and output generation module
 * @module @a2a/rag/tests/reporter/report-formatter
 * 
 * Handles formatting of reports in different output formats:
 * - Markdown: Human-readable documentation
 * - JSON: Machine-processable data
 * - HTML: Interactive visual report
 * - Console: Real-time colored output
 */

import type {
  TestReport,
} from './types.js';

export type {
  MarkdownReportOptions,
  JSONReportOptions,
  HTMLReportOptions,
  ConsoleReporterOptions,
} from './formatters';

export {
  generateMarkdownReport,
} from './formatters/markdown.js';

export {
  generateJSONReport,
} from './formatters/json.js';

export {
  generateHTMLReport,
} from './formatters/html.js';

export {
  consoleReporter,
} from './formatters/console.js';


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
 * Options for HTML report generation
 */
export interface HTMLReportOptions {
  /** Custom CSS styles */
  customStyles?: string;
  /** Include interactive charts */
  includeCharts?: boolean;
  /** Enable dark mode */
  darkMode?: boolean;
  /** Report title */
  title?: string;
}

/**
 * Options for console reporter
 */
export interface ConsoleReporterOptions {
  /** Enable colors */
  colors?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Show progress indicators */
  showProgress?: boolean;
  /** Maximum failed tests to display */
  maxFailedDisplay?: number;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format percentage with color indicator
 */
export function formatPercentage(value: number, threshold = 0.8): string {
  const percentage = (value * 100).toFixed(1);
  return `${percentage}%`;
}

/**
 * Get pass/fail status icon
 */
export function getStatusIcon(passed: boolean): string {
  return passed ? '✅' : '❌';
}

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
  
  const { summary, performance, accuracy, results, timestamp, durationMs } = report;
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

/**
 * Generate JSON report
 * 
 * @param report - Test report data
 * @param options - Report generation options
 * @returns JSON object or string
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

/**
 * Generate HTML report with interactive elements
 * 
 * @param report - Test report data
 * @param options - Report generation options
 * @returns HTML formatted string
 */
export function generateHTMLReport(
  report: TestReport,
  options: HTMLReportOptions = {}
): string {
  const {
    includeCharts = true,
    darkMode = false,
    title = 'RAG Test Report',
  } = options;
  
  const { summary, performance, accuracy, results, timestamp, durationMs } = report;
  const categories = calculateCategorySummaries(results);
  const failedTests = results.filter(r => !r.passed);
  const passRatePercent = summary.passRate * 100;
  
  const bgColor = darkMode ? '#1a1a2e' : '#ffffff';
  const textColor = darkMode ? '#e0e0e0' : '#333333';
  const cardBg = darkMode ? '#16213e' : '#f8f9fa';
  const borderColor = darkMode ? '#0f3460' : '#dee2e6';
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: ${bgColor};
      color: ${textColor};
      line-height: 1.6;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 10px;
    }
    
    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    header .subtitle {
      opacity: 0.9;
      font-size: 1.1em;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .card {
      background: ${cardBg};
      border: 1px solid ${borderColor};
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .card h2 {
      font-size: 1.3em;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid ${borderColor};
    }
    
    .metric:last-child {
      border-bottom: none;
    }
    
    .metric-value {
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }
    
    .metric-value.pass {
      color: #28a745;
    }
    
    .metric-value.fail {
      color: #dc3545;
    }
    
    .metric-value.warning {
      color: #ffc107;
    }
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .stat-box {
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      background: ${darkMode ? '#0f3460' : '#e9ecef'};
    }
    
    .stat-number {
      font-size: 2.5em;
      font-weight: bold;
      display: block;
    }
    
    .stat-label {
      font-size: 0.9em;
      opacity: 0.8;
    }
    
    .pass-rate-circle {
      width: 120px;
      height: 120px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: conic-gradient(
        #28a745 ${passRatePercent * 3.6}deg,
        #dc3545 ${passRatePercent * 3.6}deg
      );
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    
    .pass-rate-circle::before {
      content: '';
      position: absolute;
      width: 100px;
      height: 100px;
      background: ${cardBg};
      border-radius: 50%;
    }
    
    .pass-rate-text {
      position: relative;
      font-size: 1.5em;
      font-weight: bold;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid ${borderColor};
    }
    
    th {
      background: ${darkMode ? '#0f3460' : '#e9ecef'};
      font-weight: 600;
      cursor: pointer;
      user-select: none;
    }
    
    th:hover {
      background: ${darkMode ? '#1a4a7a' : '#dee2e6'};
    }
    
    tr:hover {
      background: ${darkMode ? '#1a1a3e' : '#f1f3f5'};
    }
    
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
    }
    
    .status-badge.pass {
      background: #d4edda;
      color: #155724;
    }
    
    .status-badge.fail {
      background: #f8d7da;
      color: #721c24;
    }
    
    .collapsible {
      margin-top: 20px;
    }
    
    .collapsible-header {
      background: ${darkMode ? '#0f3460' : '#e9ecef'};
      padding: 15px;
      cursor: pointer;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .collapsible-header:hover {
      background: ${darkMode ? '#1a4a7a' : '#dee2e6'};
    }
    
    .collapsible-content {
      display: none;
      padding: 15px;
      background: ${cardBg};
      border: 1px solid ${borderColor};
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    
    .collapsible-content.active {
      display: block;
    }
    
    .recommendation {
      padding: 15px;
      margin: 10px 0;
      border-left: 4px solid #ffc107;
      background: ${darkMode ? '#2a2a4e' : '#fff3cd'};
      border-radius: 4px;
    }
    
    .recommendation.critical {
      border-left-color: #dc3545;
      background: ${darkMode ? '#3a1a1a' : '#f8d7da'};
    }
    
    .recommendation.success {
      border-left-color: #28a745;
      background: ${darkMode ? '#1a3a1a' : '#d4edda'};
    }
    
    .progress-bar {
      width: 100%;
      height: 20px;
      background: ${darkMode ? '#0f3460' : '#e9ecef'};
      border-radius: 10px;
      overflow: hidden;
      margin-top: 5px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
    }
    
    footer {
      text-align: center;
      margin-top: 40px;
      padding: 20px;
      opacity: 0.7;
      font-size: 0.9em;
    }
    
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
      
      header h1 {
        font-size: 1.8em;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 ${title}</h1>
      <div class="subtitle">
        Generated: ${new Date(timestamp).toLocaleString()} | 
        Duration: ${formatDuration(durationMs)}
      </div>
    </header>
    
    <div class="grid">
      <!-- Summary Card -->
      <div class="card">
        <h2>📈 Test Summary</h2>
        <div class="pass-rate-circle">
          <span class="pass-rate-text">${passRatePercent.toFixed(1)}%</span>
        </div>
        <div class="summary-stats">
          <div class="stat-box">
            <span class="stat-number">${summary.total}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-box">
            <span class="stat-number" style="color: #28a745;">${summary.passed}</span>
            <span class="stat-label">Passed</span>
          </div>
          <div class="stat-box">
            <span class="stat-number" style="color: #dc3545;">${summary.failed}</span>
            <span class="stat-label">Failed</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">${formatDuration(durationMs)}</span>
            <span class="stat-label">Duration</span>
          </div>
        </div>
      </div>
      
      <!-- Performance Card -->
      <div class="card">
        <h2>🚀 Performance</h2>
        <div class="metric">
          <span>Avg Search Time</span>
          <span class="metric-value ${performance.avgSearchTimeMs <= report.config.thresholds.searchTimeMs ? 'pass' : 'fail'}">
            ${performance.avgSearchTimeMs.toFixed(2)}ms
          </span>
        </div>
        <div class="metric">
          <span>P95 Search Time</span>
          <span class="metric-value">${performance.p95SearchTimeMs.toFixed(2)}ms</span>
        </div>
        <div class="metric">
          <span>Memory Usage</span>
          <span class="metric-value ${performance.memoryUsageMb <= report.config.thresholds.memoryUsageMb ? 'pass' : 'fail'}">
            ${performance.memoryUsageMb.toFixed(2)} MB
          </span>
        </div>
        <div class="metric">
          <span>Peak Memory</span>
          <span class="metric-value">${performance.peakMemoryMb.toFixed(2)} MB</span>
        </div>
        ${performance.indexBuildTimeMs ? `
        <div class="metric">
          <span>Index Build Time</span>
          <span class="metric-value">${formatDuration(performance.indexBuildTimeMs)}</span>
        </div>
        ` : ''}
      </div>
      
      <!-- Accuracy Card -->
      <div class="card">
        <h2>🎯 Accuracy</h2>
        <div class="metric">
          <span>Precision</span>
          <span class="metric-value ${accuracy.precision >= report.config.thresholds.accuracyThreshold ? 'pass' : 'warning'}">
            ${(accuracy.precision * 100).toFixed(2)}%
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${accuracy.precision * 100}%"></div>
        </div>
        <div class="metric" style="margin-top: 15px;">
          <span>Recall</span>
          <span class="metric-value ${accuracy.recall >= report.config.thresholds.accuracyThreshold ? 'pass' : 'warning'}">
            ${(accuracy.recall * 100).toFixed(2)}%
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${accuracy.recall * 100}%"></div>
        </div>
        <div class="metric" style="margin-top: 15px;">
          <span>F1 Score</span>
          <span class="metric-value">${(accuracy.f1Score * 100).toFixed(2)}%</span>
        </div>
        <div class="metric">
          <span>MAP@K</span>
          <span class="metric-value">${(accuracy.mapAtK * 100).toFixed(2)}%</span>
        </div>
        <div class="metric">
          <span>NDCG</span>
          <span class="metric-value">${(accuracy.ndcg * 100).toFixed(2)}%</span>
        </div>
      </div>
    </div>
    
    <!-- Categories Table -->
    <div class="card">
      <h2>📁 Results by Category</h2>
      <table id="categoriesTable">
        <thead>
          <tr>
            <th onclick="sortTable(0)">Category ↕</th>
            <th onclick="sortTable(1)">Total ↕</th>
            <th onclick="sortTable(2)">Passed ↕</th>
            <th onclick="sortTable(3)">Failed ↕</th>
            <th onclick="sortTable(4)">Pass Rate ↕</th>
            <th onclick="sortTable(5)">Avg Duration ↕</th>
          </tr>
        </thead>
        <tbody>`;
  
  for (const category of categories) {
    html += `
          <tr>
            <td><strong>${category.name}</strong></td>
            <td>${category.total}</td>
            <td style="color: #28a745;">${category.passed}</td>
            <td style="color: ${category.failed > 0 ? '#dc3545' : '#28a745'};">${category.failed}</td>
            <td>
              <span class="status-badge ${category.passRate >= report.config.thresholds.accuracyThreshold ? 'pass' : 'fail'}">
                ${(category.passRate * 100).toFixed(1)}%
              </span>
            </td>
            <td>${formatDuration(category.avgDuration)}</td>
          </tr>`;
  }
  
  html += `
        </tbody>
      </table>
    </div>
    
    <!-- Failed Tests Section -->
    ${failedTests.length > 0 ? `
    <div class="collapsible">
      <div class="collapsible-header" onclick="toggleCollapsible(this)">
        <span><strong>❌ Failed Tests (${failedTests.length})</strong></span>
        <span>▼</span>
      </div>
      <div class="collapsible-content">
        <table>
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Category</th>
              <th>Duration</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>`;
  
  for (const test of failedTests.slice(0, 50)) {
    html += `
            <tr>
              <td>${test.name}</td>
              <td><span class="status-badge fail">${test.category}</span></td>
              <td>${formatDuration(test.durationMs)}</td>
              <td style="color: #dc3545; max-width: 400px; overflow: hidden; text-overflow: ellipsis;">
                ${test.error || 'Assertion failed'}
              </td>
            </tr>`;
  }
  
  if (failedTests.length > 50) {
    html += `
            <tr>
              <td colspan="4" style="text-align: center; opacity: 0.7;">
                ... and ${failedTests.length - 50} more failed tests
              </td>
            </tr>`;
  }
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}
    
    <!-- Recommendations Section -->
    <div class="collapsible">
      <div class="collapsible-header" onclick="toggleCollapsible(this)">
        <span><strong>💡 Recommendations</strong></span>
        <span>▼</span>
      </div>
      <div class="collapsible-content">`;
  
  const recommendations = generateRecommendations(report);
  for (const rec of recommendations) {
    const isCritical = rec.includes('Critical');
    const isSuccess = rec.includes('All metrics');
    html += `
        <div class="recommendation ${isCritical ? 'critical' : isSuccess ? 'success' : ''}">
          ${rec}
        </div>`;
  }
  
  html += `
      </div>
    </div>
    
    <footer>
      <p>📊 RAG Test Suite Report</p>
      <p>Generated at ${new Date().toLocaleString()}</p>
    </footer>
  </div>
  
  <script>
    // Table sorting
    function sortTable(n) {
      const table = document.getElementById("categoriesTable");
      let rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
      switching = true;
      dir = "asc";
      
      while (switching) {
        switching = false;
        rows = table.rows;
        
        for (i = 1; i < (rows.length - 1); i++) {
          shouldSwitch = false;
          x = rows[i].getElementsByTagName("TD")[n];
          y = rows[i + 1].getElementsByTagName("TD")[n];
          
          let xContent = x.innerHTML.toLowerCase();
          let yContent = y.innerHTML.toLowerCase();
          
          // Try to parse as number
          const xNum = parseFloat(xContent.replace(/[^0-9.-]/g, ''));
          const yNum = parseFloat(yContent.replace(/[^0-9.-]/g, ''));
          
          if (!isNaN(xNum) && !isNaN(yNum)) {
            xContent = xNum;
            yContent = yNum;
          }
          
          if (dir == "asc") {
            if (xContent > yContent) {
              shouldSwitch = true;
              break;
            }
          } else if (dir == "desc") {
            if (xContent < yContent) {
              shouldSwitch = true;
              break;
            }
          }
        }
        
        if (shouldSwitch) {
          rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
          switching = true;
          switchcount++;
        } else {
          if (switchcount == 0 && dir == "asc") {
            dir = "desc";
            switching = true;
          }
        }
      }
    }
    
    // Collapsible sections
    function toggleCollapsible(header) {
      const content = header.nextElementSibling;
      const arrow = header.querySelector('span:last-child');
      content.classList.toggle('active');
      arrow.textContent = content.classList.contains('active') ? '▲' : '▼';
    }
    
    // Auto-open failed tests if any
    ${failedTests.length > 0 ? `
    document.addEventListener('DOMContentLoaded', function() {
      const failedHeader = document.querySelector('.collapsible-header');
      if (failedHeader && failedHeader.textContent.includes('Failed')) {
        toggleCollapsible(failedHeader);
      }
    });
    ` : ''}
  </script>
</body>
</html>`;
  
  return html;
}

/**
 * Console reporter with colored output
 * 
 * @param report - Test report data
 * @param options - Reporter options
 */
export function consoleReporter(
  report: TestReport,
  options: ConsoleReporterOptions = {}
): void {
  const {
    colors = true,
    verbose = false,
    maxFailedDisplay = 10,
  } = options;
  
  const { summary, performance, accuracy, results, durationMs } = report;
  
  // ANSI color codes
  const reset = colors ? '\x1b[0m' : '';
  const bold = colors ? '\x1b[1m' : '';
  const red = colors ? '\x1b[31m' : '';
  const green = colors ? '\x1b[32m' : '';
  const yellow = colors ? '\x1b[33m' : '';
  const blue = colors ? '\x1b[34m' : '';
  const cyan = colors ? '\x1b[36m' : '';
  
  // Header
  console.log('\n' + '='.repeat(60));
  console.log(`${bold}${blue}📊 RAG TEST REPORT${reset}`);
  console.log('='.repeat(60));
  console.log(`${cyan}Generated:${reset} ${new Date(report.timestamp).toLocaleString()}`);
  console.log(`${cyan}Duration:${reset} ${formatDuration(durationMs)}`);
  console.log('');
  
  // Summary
  console.log(`${bold}📈 SUMMARY${reset}`);
  console.log('-'.repeat(40));
  const passRateColor = summary.passRate >= report.config.thresholds.accuracyThreshold ? green : red;
  console.log(`  Total Tests:    ${bold}${summary.total}${reset}`);
  console.log(`  ${green}✅ Passed:${reset}       ${bold}${green}${summary.passed}${reset}`);
  console.log(`  ${red}❌ Failed:${reset}       ${bold}${red}${summary.failed}${reset}`);
  console.log(`  📈 Pass Rate:    ${bold}${passRateColor}${(summary.passRate * 100).toFixed(1)}%${reset}`);
  console.log('');
  
  // Performance
  console.log(`${bold}🚀 PERFORMANCE METRICS${reset}`);
  console.log('-'.repeat(40));
  
  const avgTimeOk = performance.avgSearchTimeMs <= report.config.thresholds.searchTimeMs;
  const avgTimeColor = avgTimeOk ? green : red;
  console.log(`  Avg Search Time:  ${avgTimeColor}${performance.avgSearchTimeMs.toFixed(2)}ms${reset} (threshold: ${report.config.thresholds.searchTimeMs}ms)`);
  
  console.log(`  Min Search Time:  ${cyan}${performance.minSearchTimeMs.toFixed(2)}ms${reset}`);
  console.log(`  Max Search Time:  ${yellow}${performance.maxSearchTimeMs.toFixed(2)}ms${reset}`);
  console.log(`  P95 Search Time:  ${cyan}${performance.p95SearchTimeMs.toFixed(2)}ms${reset}`);
  
  const memoryOk = performance.memoryUsageMb <= report.config.thresholds.memoryUsageMb;
  const memoryColor = memoryOk ? green : red;
  console.log(`  Memory Usage:     ${memoryColor}${performance.memoryUsageMb.toFixed(2)} MB${reset} (threshold: ${report.config.thresholds.memoryUsageMb} MB)`);
  console.log(`  Peak Memory:      ${cyan}${performance.peakMemoryMb.toFixed(2)} MB${reset}`);
  
  if (performance.indexBuildTimeMs) {
    console.log(`  Index Build:      ${cyan}${formatDuration(performance.indexBuildTimeMs)}${reset}`);
  }
  if (performance.documentsIndexed) {
    console.log(`  Documents:        ${cyan}${performance.documentsIndexed}${reset}`);
  }
  console.log('');
  
  // Accuracy
  console.log(`${bold}🎯 ACCURACY METRICS${reset}`);
  console.log('-'.repeat(40));
  
  const precisionOk = accuracy.precision >= report.config.thresholds.accuracyThreshold;
  const recallOk = accuracy.recall >= report.config.thresholds.accuracyThreshold;
  
  console.log(`  Precision:  ${precisionOk ? green : yellow}${(accuracy.precision * 100).toFixed(2)}%${reset} (threshold: ${(report.config.thresholds.accuracyThreshold * 100).toFixed(0)}%)`);
  console.log(`  Recall:     ${recallOk ? green : yellow}${(accuracy.recall * 100).toFixed(2)}%${reset} (threshold: ${(report.config.thresholds.accuracyThreshold * 100).toFixed(0)}%)`);
  console.log(`  F1 Score:   ${cyan}${(accuracy.f1Score * 100).toFixed(2)}%${reset}`);
  console.log(`  MAP@K:      ${cyan}${(accuracy.mapAtK * 100).toFixed(2)}%${reset}`);
  console.log(`  NDCG:       ${cyan}${(accuracy.ndcg * 100).toFixed(2)}%${reset}`);
  console.log(`  MRR:        ${cyan}${(accuracy.mrr * 100).toFixed(2)}%${reset}`);
  console.log(`  Zero Results: ${accuracy.zeroResultQueries > 0 ? yellow : green}${accuracy.zeroResultQueries}${reset}`);
  console.log('');
  
  // Categories
  const categories = calculateCategorySummaries(results);
  console.log(`${bold}📁 CATEGORIES${reset}`);
  console.log('-'.repeat(40));
  
  for (const cat of categories) {
    const catColor = cat.passRate >= report.config.thresholds.accuracyThreshold ? green : yellow;
    console.log(`  ${cat.name.padEnd(15)} ${green}${cat.passed.toString().padStart(3)}${reset}/${cat.total.toString().padStart(3)} ${catColor}(${(cat.passRate * 100).toFixed(1)}%)${reset}`);
  }
  console.log('');
  
  // Failed tests
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log(`${bold}${red}❌ FAILED TESTS${reset} (${Math.min(failedTests.length, maxFailedDisplay)} of ${failedTests.length} shown)`);
    console.log('-'.repeat(40));
    
    for (let i = 0; i < Math.min(failedTests.length, maxFailedDisplay); i++) {
      const test = failedTests[i];
      console.log(`  ${red}✗${reset} ${test.name}`);
      console.log(`    Category: ${test.category}`);
      console.log(`    Duration: ${formatDuration(test.durationMs)}`);
      
      if (test.error) {
        console.log(`    Error: ${red}${test.error}${reset}`);
      }
      
      if (test.precision !== undefined) {
        console.log(`    Precision: ${test.precision.toFixed(3)}, Recall: ${(test.recall ?? 0).toFixed(3)}`);
      }
      
      if (verbose && test.expectedDocs && test.actualDocs) {
        console.log(`    Expected: ${test.expectedDocs.join(', ')}`);
        console.log(`    Actual:   ${test.actualDocs.join(', ')}`);
      }
      
      console.log('');
    }
    
    if (failedTests.length > maxFailedDisplay) {
      console.log(`  ${yellow}... and ${failedTests.length - maxFailedDisplay} more failed tests${reset}`);
    }
    
    console.log('');
  }
  
  // Recommendations
  console.log(`${bold}💡 RECOMMENDATIONS${reset}`);
  console.log('-'.repeat(40));
  const recommendations = generateRecommendations(report);
  for (const rec of recommendations) {
    // Remove markdown formatting for console
    const cleanRec = rec.replace(/[🚨⚠️✅*]/g, '').trim();
    console.log(`  • ${cleanRec}`);
  }
  
  // Footer
  console.log('');
  console.log('='.repeat(60));
  
  const overallStatus = summary.passRate >= 0.8 ? 'PASS' : 'FAIL';
  const statusColor = summary.passRate >= 0.8 ? green : red;
  console.log(`${bold}Overall Status: ${statusColor}${overallStatus}${reset}`);
  console.log('='.repeat(60) + '\n');
}