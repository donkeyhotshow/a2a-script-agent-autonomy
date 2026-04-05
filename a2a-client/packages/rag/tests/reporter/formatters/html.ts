/**
 * HTML Report Formatter (interactive)
 * @module @a2a/rag/tests/reporter/formatters/html
 */

import type {TestReport} from '../../types.js';

import {
  calculateCategorySummaries,
  generateRecommendations,
} from '../result-aggregator.js';

import {
  formatDuration,
} from '../utils/format-utils.js';


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
 * Generate HTML report with interactive elements
 * 
 * @param report - Test report data
 * @param options - Report generation options
 * @returns Complete HTML document string
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
    `;

  if (failedTests.length > 0) {
    html += `
    <!-- Failed Tests Section -->
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
    </div>`;
  }

  html += `
    
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
          switchcount ++;
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

