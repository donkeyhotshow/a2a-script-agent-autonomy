/**
 * @fileoverview Main reporter interface for RAG testing infrastructure
 * @module @a2a/rag/tests/reporter
 * 
 * This module provides the main reporter interface that orchestrates
 * all reporting functionality through modular components.
 */

export { 
    generateMarkdownReport,
    generateJSONReport,
    generateHTMLReport,
    consoleReporter,
    saveReport,
    generateAllReports
} from './reporter.js';

export type {
    MarkdownReportOptions,
    JSONReportOptions,
    HTMLReportOptions,
    ConsoleReporterOptions,
    CategorySummary
} from './reporter.js';

export {
    formatDuration,
    formatPercentage,
    getStatusIcon,
    calculateCategorySummaries,
    generateRecommendations
} from './reporter.js';