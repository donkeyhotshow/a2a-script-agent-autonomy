/**
 * @fileoverview Test metrics visualization utilities
 * @module @a2a/rag/tests/visualizer
 * 
 * Provides ASCII chart generation and CSV export for test metrics.
 * Useful for console output and external tool integration.
 * 
 * @example
 * ```typescript
 * import { visualizeReport, exportToCSV, asciiBarChart } from './visualizer';
 * 
 * // Generate ASCII visualizations
 * const chart = visualizeReport(report);
 * console.log(chart);
 * 
 * // Export to CSV
 * const csv = exportToCSV(report);
 * await fs.writeFile('metrics.csv', csv);
 * ```
 */

import type {
  TestReport,
  TestResult,
  PerformanceMetrics,
  AccuracyMetrics,
  CategorySummary,
} from './types.js';

/**
 * Visualization configuration options
 */
export interface VisualizerOptions {
  /** Maximum width for bar charts */
  maxBarWidth?: number;
  /** Show values on bars */
  showValues?: boolean;
  /** Decimal places for numbers */
  decimalPlaces?: number;
  /** Color support (ANSI codes) */
  colors?: boolean;
}

/**
 * Default visualization options
 */
const DEFAULT_OPTIONS: VisualizerOptions = {
  maxBarWidth: 40,
  showValues: true,
  decimalPlaces: 2,
  colors: true,
};

/**
 * ANSI color codes
 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

/**
 * Generate a horizontal bar chart
 */
function generateBarChart(
  label: string,
  value: number,
  maxValue: number,
  maxWidth: number,
  options: VisualizerOptions
): string {
  const { showValues, decimalPlaces, colors } = options;
  
  const fillRatio = Math.min(value / maxValue, 1);
  const barLength = Math.round(fillRatio * maxWidth);
  const emptyLength = maxWidth - barLength;
  
  // Determine bar color based on percentage
  let barColor = colors ? COLORS.cyan : '';
  if (fillRatio >= 0.8) barColor = colors ? COLORS.green : '';
  else if (fillRatio >= 0.5) barColor = colors ? COLORS.yellow : '';
  else if (fillRatio < 0.3) barColor = colors ? COLORS.red : '';
  
  const reset = colors ? COLORS.reset : '';
  const bar = '█'.repeat(barLength);
  const empty = '░'.repeat(emptyLength);
  
  const paddedLabel = label.padEnd(20, ' ');
  const valueStr = value.toFixed(decimalPlaces);
  
  return `${paddedLabel} │${barColor}${bar}${empty}${reset}│ ${valueStr}`;
}

/**
 * Generate ASCII bar for percentage
 */
function percentageBar(
  label: string,
  percentage: number,
  maxWidth: number,
  colors: boolean
): string {
  const filled = Math.round((percentage / 100) * maxWidth);
  const empty = maxWidth - filled;
  
  let color = colors ? COLORS.green : '';
  if (percentage < 80) color = colors ? COLORS.yellow : '';
  if (percentage < 50) color = colors ? COLORS.red : '';
  
  const reset = colors ? COLORS.reset : '';
  
  const bar = '█'.repeat(Math.max(0, Math.min(filled, maxWidth)));
  const emptyBar = '░'.repeat(Math.max(0, Math.min(empty, maxWidth)));
  
  return `${label.padEnd(15)} [${color}${bar}${reset}${emptyBar}] ${percentage.toFixed(1)}%`;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate performance metrics visualization
 */
export function visualizePerformance(
  metrics: PerformanceMetrics,
  options: VisualizerOptions = DEFAULT_OPTIONS
): string {
  const { maxBarWidth, colors } = options;
  let output = '';
  
  const bold = colors ? COLORS.bold : '';
  const reset = colors ? COLORS.reset : '';
  
  output += `${bold}📊 PERFORMANCE METRICS${reset}\n`;
  output += '─'.repeat(60) + '\n';
  
  // Search time visualization
  output += '\n⏱️  Search Time Distribution\n';
  
  const timeMetrics = [
    { label: 'Average', value: metrics.avgSearchTimeMs },
    { label: 'Minimum', value: metrics.minSearchTimeMs },
    { label: 'Maximum', value: metrics.maxSearchTimeMs },
    { label: 'P95', value: metrics.p95SearchTimeMs },
  ];
  
  const maxTime = Math.max(...timeMetrics.map(m => m.value)) || 1;
  
  for (const metric of timeMetrics) {
    output += generateBarChart(
      metric.label,
      metric.value,
      maxTime,
      maxBarWidth!,
      options
    ) + '\n';
  }
  
  // Memory visualization
  output += '\n💾 Memory Usage\n';
  
  const memoryMetrics = [
    { label: 'Current', value: metrics.memoryUsageMb },
    { label: 'Peak', value: metrics.peakMemoryMb },
  ];
  
  const maxMemory = Math.max(...memoryMetrics.map(m => m.value)) || 1;
  
  for (const metric of memoryMetrics) {
    output += generateBarChart(
      metric.label,
      metric.value,
      maxMemory,
      maxBarWidth!,
      options
    ) + '\n';
  }
  
  // Index stats
  if (metrics.documentsIndexed || metrics.chunksIndexed) {
    output += '\n📁 Index Statistics\n';
    
    if (metrics.documentsIndexed) {
      output += `   Documents: ${metrics.documentsIndexed}\n`;
    }
    if (metrics.chunksIndexed) {
      output += `   Chunks:    ${metrics.chunksIndexed}\n`;
    }
    if (metrics.indexBuildTimeMs) {
      output += `   Build:     ${metrics.indexBuildTimeMs}ms\n`;
    }
  }
  
  return output;
}

/**
 * Generate accuracy metrics visualization
 */
export function visualizeAccuracy(
  metrics: AccuracyMetrics,
  threshold: number = 0.8,
  options: VisualizerOptions = DEFAULT_OPTIONS
): string {
  const { maxBarWidth, colors } = options;
  let output = '';
  
  const bold = colors ? COLORS.bold : '';
  const reset = colors ? COLORS.reset : '';
  
  output += `${bold}🎯 ACCURACY METRICS${reset}\n`;
  output += '─'.repeat(60) + '\n';
  
  // Metric bars
  const accuracyMetrics = [
    { label: 'Precision', value: metrics.precision * 100 },
    { label: 'Recall', value: metrics.recall * 100 },
    { label: 'F1 Score', value: metrics.f1Score * 100 },
    { label: 'MAP@K', value: metrics.mapAtK * 100 },
    { label: 'NDCG', value: metrics.ndcg * 100 },
  ];
  
  for (const metric of accuracyMetrics) {
    const status = metric.value >= threshold * 100 ? '✓' : '✗';
    output += percentageBar(
      `${metric.label} ${status}`,
      metric.value,
      maxBarWidth!,
      colors!
    ) + '\n';
  }
  
  // Additional stats
  output += '\n📈 Additional Metrics\n';
  output += `   Zero Result Queries: ${metrics.zeroResultQueries}\n`;
  output += `   Avg Results/Query:    ${metrics.avgResultCount.toFixed(2)}\n`;
  output += `   MRR:                  ${metrics.mrr.toFixed(4)}\n`;
  
  return output;
}

/**
 * Generate category breakdown visualization
 */
export function visualizeCategories(
  categories: CategorySummary[],
  options: VisualizerOptions = DEFAULT_OPTIONS
): string {
  const { maxBarWidth, colors } = options;
  let output = '';
  
  const bold = colors ? COLORS.bold : '';
  const reset = colors ? COLORS.reset : '';
  
  output += `${bold}📁 TEST CATEGORIES${reset}\n`;
  output += '─'.repeat(60) + '\n';
  
  // Find max for scaling
  const maxTotal = Math.max(...categories.map(c => c.total)) || 1;
  
  for (const cat of categories) {
    const passRate = cat.passRate * 100;
    const status = passRate >= 80 ? '✓' : passRate >= 50 ? '⚠' : '✗';
    
    output += `\n${cat.name} ${status}\n`;
    output += generateBarChart(
      '  Progress',
      cat.passed,
      maxTotal,
      maxBarWidth!,
      { ...options, showValues: false }
    ) + '\n';
    
    output += `  Passed: ${cat.passed}/${cat.total} (${passRate.toFixed(1)}%)\n`;
    output += `  Failed: ${cat.failed}\n`;
    output += `  Avg Duration: ${cat.avgDuration.toFixed(2)}ms\n`;
  }
  
  return output;
}

/**
 * Generate test results timeline visualization
 */
export function visualizeTimeline(
  results: TestResult[],
  options: VisualizerOptions = DEFAULT_OPTIONS
): string {
  const { colors } = options;
  let output = '';
  
  const bold = colors ? COLORS.bold : '';
  const reset = colors ? COLORS.reset : '';
  
  output += `${bold}📅 TEST TIMELINE${reset}\n`;
  output += '─'.repeat(60) + '\n';
  
  // Sort by duration
  const sorted = [...results].sort((a, b) => b.durationMs - a.durationMs);
  
  // Top 10 slowest tests
  output += '\n🐢 Top 10 Slowest Tests\n';
  
  for (let i = 0; i < Math.min(10, sorted.length); i++) {
    const test = sorted[i];
    const icon = test.passed ? '✓' : '✗';
    const color = test.passed 
      ? (colors ? COLORS.green : '')
      : (colors ? COLORS.red : '');
    
    output += `  ${i + 1}. ${color}${icon}${reset} ${test.name}\n`;
    output += `     Duration: ${test.durationMs}ms\n`;
  }
  
  return output;
}

/**
 * Generate complete report visualization
 */
export function visualizeReport(
  report: TestReport,
  options: VisualizerOptions = DEFAULT_OPTIONS
): string {
  const { colors } = options;
  let output = '';
  
  const bold = colors ? COLORS.bold : '';
  const cyan = colors ? COLORS.cyan : '';
  const reset = colors ? COLORS.reset : '';
  
  // Header
  output += `${bold}${cyan}╔══════════════════════════════════════════════════════════╗${reset}\n`;
  output += `${bold}${cyan}║           RAG TEST REPORT VISUALIZATION                   ║${reset}\n`;
  output += `${bold}${cyan}╚══════════════════════════════════════════════════════════╝${reset}\n`;
  
  output += `\n📅 Generated: ${new Date(report.timestamp).toLocaleString()}\n`;
  output += `⏱️  Duration: ${report.durationMs}ms\n`;
  
  // Summary
  output += `\n${bold}📊 SUMMARY${reset}\n`;
  output += '─'.repeat(60) + '\n';
  
  const { summary } = report;
  output += `   Total:  ${summary.total} tests\n`;
  output += `   Passed: ${colors ? COLORS.green : ''}${summary.passed}${reset}\n`;
  output += `   Failed: ${colors ? COLORS.red : ''}${summary.failed}${reset}\n`;
  output += `   Rate:   ${percentageBar('', summary.passRate * 100, 30, colors!)}\n`;
  
  // Performance
  output += '\n' + visualizePerformance(report.performance, options);
  
  // Accuracy
  output += '\n' + visualizeAccuracy(report.accuracy, report.config.thresholds.accuracyThreshold, options);
  
  // Categories
  const categories = calculateCategorySummariesFromResults(report.results);
  output += '\n' + visualizeCategories(categories, options);
  
  // Timeline
  output += '\n' + visualizeTimeline(report.results, options);
  
  return output;
}

/**
 * Calculate category summaries from results
 */
function calculateCategorySummariesFromResults(results: TestResult[]): CategorySummary[] {
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
 * Export test results to CSV format
 */
export function exportToCSV(
  report: TestReport,
  options: { includeHeaders?: boolean } = {}
): string {
  const { includeHeaders = true } = options;
  let csv = '';
  
  // Results CSV
  if (includeHeaders) {
    csv += '=== TEST RESULTS ===\n';
    csv += 'id,name,category,passed,duration_ms,precision,recall,f1_score,error\n';
  }
  
  for (const result of report.results) {
    const escapedName = result.name.replace(/"/g, '""');
    const error = result.error ? result.error.replace(/"/g, '""') : '';
    
    csv += [
      result.id,
      `"${escapedName}"`,
      result.category,
      result.passed,
      result.durationMs,
      result.precision?.toFixed(4) ?? '',
      result.recall?.toFixed(4) ?? '',
      result.f1Score?.toFixed(4) ?? '',
      `"${error}"`
    ].join(',') + '\n';
  }
  
  // Performance metrics
  csv += '\n=== PERFORMANCE METRICS ===\n';
  csv += 'metric,value\n';
  
  const perf = report.performance;
  csv += `total_time_ms,${perf.totalTimeMs}\n`;
  csv += `avg_search_time_ms,${perf.avgSearchTimeMs.toFixed(4)}\n`;
  csv += `min_search_time_ms,${perf.minSearchTimeMs.toFixed(4)}\n`;
  csv += `max_search_time_ms,${perf.maxSearchTimeMs.toFixed(4)}\n`;
  csv += `p95_search_time_ms,${perf.p95SearchTimeMs.toFixed(4)}\n`;
  csv += `memory_usage_mb,${perf.memoryUsageMb.toFixed(4)}\n`;
  csv += `peak_memory_mb,${perf.peakMemoryMb.toFixed(4)}\n`;
  
  if (perf.documentsIndexed) csv += `documents_indexed,${perf.documentsIndexed}\n`;
  if (perf.chunksIndexed) csv += `chunks_indexed,${perf.chunksIndexed}\n`;
  if (perf.indexBuildTimeMs) csv += `index_build_time_ms,${perf.indexBuildTimeMs}\n`;
  
  // Accuracy metrics
  csv += '\n=== ACCURACY METRICS ===\n';
  csv += 'metric,value\n';
  
  const acc = report.accuracy;
  csv += `precision,${acc.precision.toFixed(4)}\n`;
  csv += `recall,${acc.recall.toFixed(4)}\n`;
  csv += `f1_score,${acc.f1Score.toFixed(4)}\n`;
  csv += `map_at_k,${acc.mapAtK.toFixed(4)}\n`;
  csv += `ndcg,${acc.ndcg.toFixed(4)}\n`;
  csv += `mrr,${acc.mrr.toFixed(4)}\n`;
  csv += `zero_result_queries,${acc.zeroResultQueries}\n`;
  csv += `avg_result_count,${acc.avgResultCount.toFixed(4)}\n`;
  
  // Summary
  csv += '\n=== SUMMARY ===\n';
  csv += 'metric,value\n';
  
  const sum = report.summary;
  csv += `total,${sum.total}\n`;
  csv += `passed,${sum.passed}\n`;
  csv += `failed,${sum.failed}\n`;
  csv += `skipped,${sum.skipped}\n`;
  csv += `pass_rate,${sum.passRate.toFixed(4)}\n`;
  csv += `duration_ms,${report.durationMs}\n`;
  
  return csv;
}

/**
 * Export to JSON Lines format (for streaming/logging)
 */
export function exportToJSONLines(
  report: TestReport
): string {
  let lines = '';
  
  // One line per test result
  for (const result of report.results) {
    lines += JSON.stringify({
      type: 'test_result',
      timestamp: report.timestamp,
      ...result,
    }) + '\n';
  }
  
  // Performance metrics as one line
  lines += JSON.stringify({
    type: 'performance_metrics',
    timestamp: report.timestamp,
    ...report.performance,
  }) + '\n';
  
  // Accuracy metrics as one line
  lines += JSON.stringify({
    type: 'accuracy_metrics',
    timestamp: report.timestamp,
    ...report.accuracy,
  }) + '\n';
  
  return lines;
}

/**
 * Generate comparison visualization between two reports
 */
export function visualizeComparison(
  current: TestReport,
  previous: TestReport,
  options: VisualizerOptions = DEFAULT_OPTIONS
): string {
  const { colors } = options;
  let output = '';
  
  const bold = colors ? COLORS.bold : '';
  const green = colors ? COLORS.green : '';
  const red = colors ? COLORS.red : '';
  const yellow = colors ? COLORS.yellow : '';
  const reset = colors ? COLORS.reset : '';
  
  // Header
  output += `${bold}📊 COMPARISON: CURRENT vs PREVIOUS${reset}\n`;
  output += '─'.repeat(60) + '\n';
  
  // Summary comparison
  output += `\n${bold}📈 SUMMARY${reset}\n`;
  
  const summaryChanges = [
    { label: 'Pass Rate', current: current.summary.passRate * 100, prev: previous.summary.passRate * 100 },
    { label: 'Passed', current: current.summary.passed, prev: previous.summary.passed },
    { label: 'Failed', current: current.summary.failed, prev: previous.summary.failed },
  ];
  
  for (const change of summaryChanges) {
    const diff = change.current - change.prev;
    const diffStr = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
    const color = diff > 0 ? green : diff < 0 ? red : '';
    
    output += `   ${change.label.padEnd(15)}: ${change.current.toFixed(2)} (${color}${diffStr}${reset})\n`;
  }
  
  // Performance comparison
  output += `\n${bold}🚀 PERFORMANCE${reset}\n`;
  
  const perfChanges = [
    { label: 'Avg Search', current: current.performance.avgSearchTimeMs, prev: previous.performance.avgSearchTimeMs },
    { label: 'P95 Search', current: current.performance.p95SearchTimeMs, prev: previous.performance.p95SearchTimeMs },
    { label: 'Memory', current: current.performance.memoryUsageMb, prev: previous.performance.memoryUsageMb },
  ];
  
  for (const change of perfChanges) {
    const diff = change.current - change.prev;
    const percentDiff = change.prev !== 0 ? (diff / change.prev) * 100 : 0;
    const diffStr = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
    const percentStr = percentDiff >= 0 ? `+${percentDiff.toFixed(1)}%` : `${percentDiff.toFixed(1)}%`;
    
    // Negative is good for performance (faster = better)
    let color = colors ? COLORS.green : '';
    if (diff > 0) color = colors ? COLORS.red : '';
    
    output += `   ${change.label.padEnd(15)}: ${change.current.toFixed(2)}ms (${color}${diffStr}${reset}, ${percentStr})\n`;
  }
  
  // Accuracy comparison
  output += `\n${bold}🎯 ACCURACY${reset}\n`;
  
  const accChanges = [
    { label: 'Precision', current: current.accuracy.precision * 100, prev: previous.accuracy.precision * 100 },
    { label: 'Recall', current: current.accuracy.recall * 100, prev: previous.accuracy.recall * 100 },
    { label: 'F1 Score', current: current.accuracy.f1Score * 100, prev: previous.accuracy.f1Score * 100 },
  ];
  
  for (const change of accChanges) {
    const diff = change.current - change.prev;
    const diffStr = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
    
    // Positive is good for accuracy
    let color = colors ? COLORS.green : '';
    if (diff < 0) color = colors ? COLORS.red : '';
    
    output += `   ${change.label.padEnd(15)}: ${change.current.toFixed(2)}% (${color}${diffStr}${reset}%)\n`;
  }
  
  return output;
}

/**
 * Generate a simple sparkline for an array of numbers
 */
export function sparkline(
  values: number[],
  options: { width?: number; height?: number } = {}
): string {
  const { width = 20, height = 3 } = options;
  
  if (values.length === 0) return '';
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  // Sample values to fit width
  const step = Math.max(1, Math.floor(values.length / width));
  const sampled = [];
  
  for (let i = 0; i < values.length; i += step) {
    sampled.push(values[i]);
  }
  
  // Characters for different heights
  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  let result = '';
  
  // Create each row
  for (let row = height - 1; row >= 0; row--) {
    let line = '';
    
    for (const value of sampled) {
      const normalized = ((value - min) / range) * (height - 1);
      const charIndex = Math.round(normalized);
      
      if (charIndex === row) {
        line += chars[Math.min(charIndex, chars.length - 1)];
      } else if (charIndex > row) {
        line += ' ';
      } else {
        line += ' ';
      }
    }
    
    result += line + '\n';
  }
  
  return result.trimEnd();
}

export default {
  visualizeReport,
  visualizePerformance,
  visualizeAccuracy,
  visualizeCategories,
  visualizeTimeline,
  visualizeComparison,
  exportToCSV,
  exportToJSONLines,
  sparkline,
};
