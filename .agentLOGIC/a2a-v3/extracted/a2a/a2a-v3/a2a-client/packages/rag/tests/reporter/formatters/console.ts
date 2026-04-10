/**
 * Console Report Formatter (colored CLI output)
 * @module @a2a/rag/tests/reporter/formatters/console
 */

import type {TestReport} from '../../types.js';

import {
  calculateCategorySummaries,
  generateRecommendations,
} from '../result-aggregator.js';

import {
  formatDuration,
  formatPercentage,
  getStatusIcon,
} from '../utils/format-utils.js';


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
 * Console reporter with colored output
 * 
 * @param report - Test report data
 * @param options - Reporter options
 * @returns void (logs directly to console)
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
  
  const { summary, performance, accuracy, results, durationMs, config } = report;
  
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

