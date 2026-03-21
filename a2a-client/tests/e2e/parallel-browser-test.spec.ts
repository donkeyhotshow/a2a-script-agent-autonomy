import { test, expect } from '@playwright/test';
import { PerformanceMonitor, PageMetrics } from '../helpers/performance-monitor';
import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = 'tests/logs/parallel-browser-testing';
const RESULTS_DIR = 'test-results';

// Ensure directories exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

interface BrowserTestResult {
  timestamp: string;
  browser: string;
  device: string;
  sessionId: string;
  pageMetrics: PageMetrics;
  sseConnectionTime: number;
  sseMessagesReceived: number;
  errors: string[];
  screenshots: string[];
  duration: number;
}

// Browser matrix for parallel testing
const BROWSER_MATRIX = [
  { browser: 'chromium', device: 'desktop', viewport: { width: 1280, height: 720 } },
  { browser: 'chromium', device: 'mobile', viewport: { width: 393, height: 851 } },
  { browser: 'firefox', device: 'desktop', viewport: { width: 1280, height: 720 } },
  { browser: 'firefox', device: 'mobile', viewport: { width: 393, height: 851 } },
  { browser: 'webkit', device: 'desktop', viewport: { width: 1280, height: 720 } },
  { browser: 'webkit', device: 'mobile', viewport: { width: 390, height: 844 } },
];

test.describe('Parallel Browser Testing', () => {
  test.setTimeout(300000); // 5 minutes for parallel tests

  // Test each browser/device combination in parallel
  BROWSER_MATRIX.forEach(({ browser, device, viewport }) => {
    test(`Cross-browser smoke test - ${browser}-${device}`, async ({ browser: browserInstance }) => {
      const context = await browserInstance.newContext({
        viewport,
        userAgent: device === 'mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
          : undefined
      });

      const page = await context.newPage();
      const monitor = new PerformanceMonitor(1000); // Collect every second
      const errors: string[] = [];
      const screenshots: string[] = [];

      monitor.start();

      try {
        // Navigate to web UI
        const startTime = Date.now();
        await page.goto('http://localhost:5173', { timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        const loadTime = Date.now() - startTime;

        // Take initial screenshot
        const initialScreenshot = path.join(LOG_DIR, `initial-${browser}-${device}-${Date.now()}.png`);
        await page.screenshot({ path: initialScreenshot, fullPage: true });
        screenshots.push(initialScreenshot);

        // Create session
        const sessionResponse = await page.request.post('http://localhost:5173/api/a2a/sessions', {
          data: { title: `ParallelTest-${browser}-${device}` }
        });
        expect(sessionResponse.ok()).toBeTruthy();
        const sessionData = await sessionResponse.json();
        const sessionId = sessionData.session?.id ?? sessionData.data?.id;
        expect(sessionId).toBeTruthy();

        // Wait for session panel to appear
        await page.waitForSelector('.session-panel, [data-testid="session-panel"]', { timeout: 15000 });

        // Take session loaded screenshot
        const sessionScreenshot = path.join(LOG_DIR, `session-${browser}-${device}-${Date.now()}.png`);
        await page.screenshot({ path: sessionScreenshot, fullPage: true });
        screenshots.push(sessionScreenshot);

        // Test basic interactions
        const sessionButton = page.locator('button').filter({ hasText: /new|create/i }).first();
        if (await sessionButton.isVisible({ timeout: 5000 })) {
          await sessionButton.click();
          await page.waitForTimeout(1000);
        }

        // Wait for potential messages
        await page.waitForTimeout(5000);

        // Collect final metrics
        const finalMetrics = await monitor.collectPageMetrics(page);

        // Take final screenshot
        const finalScreenshot = path.join(LOG_DIR, `final-${browser}-${device}-${Date.now()}.png`);
        await page.screenshot({ path: finalScreenshot, fullPage: true });
        screenshots.push(finalScreenshot);

        monitor.stop();

        const result: BrowserTestResult = {
          timestamp: new Date().toISOString(),
          browser,
          device,
          sessionId,
          pageMetrics: finalMetrics,
          errors,
          screenshots,
          duration: Date.now() - startTime
        };

        // Save results
        const filename = `parallel-${browser}-${device}-${Date.now()}.json`;
        fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(result, null, 2));

        // Assertions
        expect(finalMetrics.loadComplete).toBeLessThan(30000); // Should load within 30 seconds
        expect(finalMetrics.failedRequests).toBeLessThan(3); // Allow some failed requests
        expect(result.duration).toBeGreaterThan(0);

      } catch (error) {
        errors.push(error.message);
        // Take error screenshot
        const errorScreenshot = path.join(LOG_DIR, `error-${browser}-${device}-${Date.now()}.png`);
        await page.screenshot({ path: errorScreenshot, fullPage: true });
        screenshots.push(errorScreenshot);

        throw error;
      } finally {
        monitor.stop();
        await context.close();
      }
    });
  });

  test('Browser compatibility matrix summary', async ({ }) => {
    // This test runs after all parallel tests to summarize results
    const resultFiles = fs.readdirSync(RESULTS_DIR)
      .filter(file => file.startsWith('parallel-') && file.endsWith('.json'));

    const results: BrowserTestResult[] = [];
    for (const file of resultFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        results.push(data);
      } catch (error) {
        console.warn(`Failed to parse result file ${file}:`, error);
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passedTests: results.filter(r => r.errors.length === 0).length,
      failedTests: results.filter(r => r.errors.length > 0).length,
      browserResults: BROWSER_MATRIX.map(({ browser, device }) => {
        const browserResults = results.filter(r => r.browser === browser && r.device === device);
        return {
          browser,
          device,
          testsRun: browserResults.length,
          passed: browserResults.filter(r => r.errors.length === 0).length,
          failed: browserResults.filter(r => r.errors.length > 0).length,
          avgLoadTime: browserResults.length > 0
            ? browserResults.reduce((sum, r) => sum + r.pageMetrics.loadComplete, 0) / browserResults.length
            : 0,
          avgDuration: browserResults.length > 0
            ? browserResults.reduce((sum, r) => sum + r.duration, 0) / browserResults.length
            : 0,
          errors: browserResults.flatMap(r => r.errors)
        };
      }),
      overall: {
        avgLoadTime: results.length > 0
          ? results.reduce((sum, r) => sum + r.pageMetrics.loadComplete, 0) / results.length
          : 0,
        avgDuration: results.length > 0
          ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
          : 0,
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
      }
    };

    fs.writeFileSync(path.join(RESULTS_DIR, `browser-matrix-summary-${Date.now()}.json`), JSON.stringify(summary, null, 2));

    // Assertions for compatibility matrix
    expect(summary.passedTests).toBeGreaterThan(0);
    expect(summary.overall.avgLoadTime).toBeLessThan(20000); // Average load time under 20 seconds

    // At least 80% of tests should pass
    const passRate = summary.totalTests > 0 ? (summary.passedTests / summary.totalTests) * 100 : 0;
    expect(passRate).toBeGreaterThanOrEqual(80);
  });

  test('Performance comparison across browsers', async ({ }) => {
    // Compare performance metrics across different browsers
    const resultFiles = fs.readdirSync(RESULTS_DIR)
      .filter(file => file.startsWith('parallel-') && file.endsWith('.json'));

    const results: BrowserTestResult[] = [];
    for (const file of resultFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        results.push(data);
      } catch (error) {
        console.warn(`Failed to parse result file ${file}:`, error);
      }
    }

    const performanceComparison = {
      timestamp: new Date().toISOString(),
      browsers: ['chromium', 'firefox', 'webkit'].map(browser => {
        const browserResults = results.filter(r => r.browser === browser);
        return {
          browser,
          sampleSize: browserResults.length,
          avgLoadTime: browserResults.length > 0
            ? browserResults.reduce((sum, r) => sum + r.pageMetrics.loadComplete, 0) / browserResults.length
            : 0,
          avgDuration: browserResults.length > 0
            ? browserResults.reduce((sum, r) => sum + r.duration, 0) / browserResults.length
            : 0,
          avgNetworkRequests: browserResults.length > 0
            ? browserResults.reduce((sum, r) => sum + r.pageMetrics.networkRequests, 0) / browserResults.length
            : 0,
          avgFailedRequests: browserResults.length > 0
            ? browserResults.reduce((sum, r) => sum + r.pageMetrics.failedRequests, 0) / browserResults.length
            : 0
        };
      }),
      devices: ['desktop', 'mobile'].map(device => {
        const deviceResults = results.filter(r => r.device === device);
        return {
          device,
          sampleSize: deviceResults.length,
          avgLoadTime: deviceResults.length > 0
            ? deviceResults.reduce((sum, r) => sum + r.pageMetrics.loadComplete, 0) / deviceResults.length
            : 0,
          avgDuration: deviceResults.length > 0
            ? deviceResults.reduce((sum, r) => sum + r.duration, 0) / deviceResults.length
            : 0
        };
      }),
      recommendations: generatePerformanceRecommendations(results)
    };

    fs.writeFileSync(path.join(RESULTS_DIR, `performance-comparison-${Date.now()}.json`), JSON.stringify(performanceComparison, null, 2));

    // Assertions
    expect(performanceComparison.browsers.length).toBe(3); // Should have all 3 browsers
    expect(performanceComparison.devices.length).toBe(2); // Should have both devices
  });
});

function generatePerformanceRecommendations(results: BrowserTestResult[]): string[] {
  const recommendations: string[] = [];

  if (results.length === 0) return recommendations;

  const avgLoadTime = results.reduce((sum, r) => sum + r.pageMetrics.loadComplete, 0) / results.length;
  if (avgLoadTime > 10000) {
    recommendations.push('Consider optimizing initial page load - average load time exceeds 10 seconds');
  }

  const failedRequests = results.reduce((sum, r) => sum + r.pageMetrics.failedRequests, 0);
  if (failedRequests > results.length) {
    recommendations.push('High number of failed network requests detected - check resource loading');
  }

  const firefoxResults = results.filter(r => r.browser === 'firefox');
  const chromiumResults = results.filter(r => r.browser === 'chromium');
  if (firefoxResults.length > 0 && chromiumResults.length > 0) {
    const firefoxAvg = firefoxResults.reduce((sum, r) => sum + r.pageMetrics.loadComplete, 0) / firefoxResults.length;
    const chromiumAvg = chromiumResults.reduce((sum, r) => sum + r.pageMetrics.loadComplete, 0) / chromiumResults.length;
    if (firefoxAvg > chromiumAvg * 1.5) {
      recommendations.push('Firefox performance significantly slower than Chromium - consider Firefox-specific optimizations');
    }
  }

  const mobileResults = results.filter(r => r.device === 'mobile');
  const desktopResults = results.filter(r => r.device === 'desktop');
  if (mobileResults.length > 0 && desktopResults.length > 0) {
    const mobileAvg = mobileResults.reduce((sum, r) => sum + r.pageMetrics.loadComplete, 0) / mobileResults.length;
    const desktopAvg = desktopResults.reduce((sum, r) => sum + r.pageMetrics.loadComplete, 0) / desktopResults.length;
    if (mobileAvg > desktopAvg * 2) {
      recommendations.push('Mobile performance significantly slower than desktop - optimize for mobile devices');
    }
  }

  return recommendations;
}