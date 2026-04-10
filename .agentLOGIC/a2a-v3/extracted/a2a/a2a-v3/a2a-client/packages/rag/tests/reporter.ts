/**
 * Main reporter facade for RAG tests. Delegates each format generator to a
 * dedicated module so the entry point stays lightweight.
 */

import fs from 'fs/promises';
import path from 'path';
import type { TestReport } from './types.js';

import { generateMarkdownReport } from './reporter/formats/markdown.js';
import { generateJSONReport } from './reporter/formats/json.js';
import { generateHTMLReport } from './reporter/formats/html.js';
import { consoleReporter } from './reporter/formats/console.js';

export type { MarkdownReportOptions } from './reporter/formats/markdown.js';
export type { JSONReportOptions } from './reporter/formats/json.js';
export type { HTMLReportOptions } from './reporter/formats/html.js';
export type { ConsoleReporterOptions } from './reporter/formats/console.js';

export { formatDuration, formatPercentage, getStatusIcon } from './reporter/report-formatter.js';
export { calculateCategorySummaries, generateRecommendations, type CategorySummary } from './reporter/result-aggregator.js';

/**
 * Save report to file in specified format
 *
 * @param report - Test report
 * @param outputPath - Output file path
 * @param format - Report format
 */
export async function saveReport(
  report: TestReport,
  outputPath: string,
  format: 'markdown' | 'html' | 'json' | 'auto' = 'auto'
): Promise<void> {
  if (format === 'auto') {
    const ext = path.extname(outputPath).toLowerCase();
    if (ext === '.md' || ext === '.markdown') format = 'markdown';
    else if (ext === '.html' || ext === '.htm') format = 'html';
    else if (ext === '.json') format = 'json';
    else format = 'markdown';
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  let content: string;

  switch (format) {
    case 'markdown':
      content = generateMarkdownReport(report);
      break;
    case 'html':
      content = generateHTMLReport(report);
      break;
    case 'json':
      content = JSON.stringify(generateJSONReport(report, { pretty: true }), null, 2);
      break;
    default:
      throw new Error(`Unknown report format: ${format}`);
  }

  await fs.writeFile(outputPath, content, 'utf-8');
}

/**
 * Generate all report formats at once
 *
 * @param report - Test report
 * @param outputDir - Output directory
 * @param basename - Base filename (without extension)
 */
export async function generateAllReports(
  report: TestReport,
  outputDir: string,
  basename: string
): Promise<{ markdown: string; html: string; json: string }> {
  const paths = {
    markdown: path.join(outputDir, `${basename}.md`),
    html: path.join(outputDir, `${basename}.html`),
    json: path.join(outputDir, `${basename}.json`),
  };

  await fs.mkdir(outputDir, { recursive: true });

  await Promise.all([
    saveReport(report, paths.markdown, 'markdown'),
    saveReport(report, paths.html, 'html'),
    saveReport(report, paths.json, 'json'),
  ]);

  return paths;
}

export default {
  generateMarkdownReport,
  generateJSONReport,
  generateHTMLReport,
  consoleReporter,
  saveReport,
  generateAllReports,
};
