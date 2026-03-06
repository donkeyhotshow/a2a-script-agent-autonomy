import { test, expect } from '@playwright/test';
import { ScreenshotComparison, VisualRegressionConfig } from '../helpers/screenshot-comparison';
import * as fs from 'fs';
import * as path from 'path';

const BASELINE_DIR = 'tests/visual-baselines';
const CURRENT_DIR = 'tests/visual-current';
const DIFF_DIR = 'tests/visual-diffs';
const RESULTS_DIR = 'test-results';

// Ensure directories exist
[BASELINE_DIR, CURRENT_DIR, DIFF_DIR, RESULTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Visual regression configuration
const visualConfig: VisualRegressionConfig = {
  threshold: 0.01, // 1% difference allowed
  baselineDir: BASELINE_DIR,
  currentDir: CURRENT_DIR,
  diffDir: DIFF_DIR,
  updateBaselines: process.env.UPDATE_BASELINES === 'true'
};

const screenshotComparison = new ScreenshotComparison(visualConfig);

test.describe('Visual Regression Testing', () => {
  test.setTimeout(120000); // 2 minutes for visual tests

  test('Web UI Visual Baseline', async ({ page, browserName }) => {
    const testName = ScreenshotComparison.generateTestName('web-ui-baseline', browserName, 'desktop');

    // Navigate to page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    const fullPageScreenshot = await page.screenshot({ fullPage: true });
    const fullPageResult = await screenshotComparison.compareScreenshots(
      testName,
      'full-page',
      fullPageScreenshot
    );

    // Take viewport screenshot
    const viewportScreenshot = await page.screenshot({ fullPage: false });
    const viewportResult = await screenshotComparison.compareScreenshots(
      testName,
      'viewport',
      viewportScreenshot
    );

    // Wait for session panel and take screenshot
    await page.waitForSelector('.session-panel, [data-testid="session-panel"]', { timeout: 10000 });
    const sessionPanelScreenshot = await page.screenshot({ fullPage: false });
    const sessionPanelResult = await screenshotComparison.compareScreenshots(
      testName,
      'session-panel',
      sessionPanelScreenshot
    );

    const results = [fullPageResult, viewportResult, sessionPanelResult];
    const summary = screenshotComparison.getComparisonSummary(results);

    // Save results
    const resultData = {
      timestamp: new Date().toISOString(),
      testName,
      browser: browserName,
      results,
      summary,
      config: visualConfig
    };

    fs.writeFileSync(
      path.join(RESULTS_DIR, `visual-regression-${testName}-${Date.now()}.json`),
      JSON.stringify(resultData, null, 2)
    );

    // Assertions
    expect(summary.passed).toBe(summary.total); // All screenshots should pass
    expect(summary.failed).toBe(0);
    expect(summary.avgDifferencePercentage).toBeLessThan(visualConfig.threshold * 100);
  });

  test('Interactive Elements Visual Test', async ({ page, browserName }) => {
    const testName = ScreenshotComparison.generateTestName('interactive-elements', browserName, 'desktop');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Initial state
    const initialScreenshot = await page.screenshot({ fullPage: false });
    const initialResult = await screenshotComparison.compareScreenshots(
      testName,
      'initial-state',
      initialScreenshot
    );

    // Click session creation button (if available)
    const createButton = page.locator('button').filter({ hasText: /new|create|session/i }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);

      const afterClickScreenshot = await page.screenshot({ fullPage: false });
      const afterClickResult = await screenshotComparison.compareScreenshots(
        testName,
        'after-create-click',
        afterClickScreenshot
      );

      // Test hover states (if applicable)
      await createButton.hover();
      await page.waitForTimeout(500);

      const hoverScreenshot = await page.screenshot({ fullPage: false });
      const hoverResult = await screenshotComparison.compareScreenshots(
        testName,
        'button-hover',
        hoverScreenshot
      );

      const results = [initialResult, afterClickResult, hoverResult];
      const summary = screenshotComparison.getComparisonSummary(results);

      const resultData = {
        timestamp: new Date().toISOString(),
        testName,
        browser: browserName,
        results,
        summary,
        interactions: ['initial', 'create-button-click', 'button-hover']
      };

      fs.writeFileSync(
        path.join(RESULTS_DIR, `visual-interaction-${testName}-${Date.now()}.json`),
        JSON.stringify(resultData, null, 2)
      );

      expect(summary.passed).toBe(summary.total);
    } else {
      // If no interactive elements found, just test initial state
      const results = [initialResult];
      const summary = screenshotComparison.getComparisonSummary(results);

      expect(summary.passed).toBe(summary.total);
    }
  });

  test('Responsive Design Visual Test', async ({ page, browserName }) => {
    const testName = ScreenshotComparison.generateTestName('responsive-design', browserName, 'responsive');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 720 },
      { name: 'wide', width: 1920, height: 1080 }
    ];

    const results = [];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Allow layout to settle

      const screenshot = await page.screenshot({ fullPage: true });
      const result = await screenshotComparison.compareScreenshots(
        testName,
        `viewport-${viewport.name}`,
        screenshot
      );

      results.push({
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        ...result
      });
    }

    const summary = screenshotComparison.getComparisonSummary(results);

    const resultData = {
      timestamp: new Date().toISOString(),
      testName,
      browser: browserName,
      results,
      summary,
      viewports: viewports.map(v => v.name)
    };

    fs.writeFileSync(
      path.join(RESULTS_DIR, `visual-responsive-${testName}-${Date.now()}.json`),
      JSON.stringify(resultData, null, 2)
    );

    // Assertions - responsive design should work across viewports
    expect(summary.passed).toBe(summary.total);
    expect(results.length).toBe(viewports.length);
  });

  test('Theme Consistency Test', async ({ page, browserName }) => {
    const testName = ScreenshotComparison.generateTestName('theme-consistency', browserName, 'desktop');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Test different theme states if theme switching is available
    const screenshots = [];

    // Default theme
    const defaultScreenshot = await page.screenshot({ fullPage: false });
    const defaultResult = await screenshotComparison.compareScreenshots(
      testName,
      'theme-default',
      defaultScreenshot
    );
    screenshots.push({ name: 'default', ...defaultResult });

    // Look for theme toggle buttons
    const themeToggle = page.locator('button').filter({ hasText: /theme|dark|light/i }).first();
    if (await themeToggle.isVisible({ timeout: 3000 })) {
      await themeToggle.click();
      await page.waitForTimeout(1000);

      const darkScreenshot = await page.screenshot({ fullPage: false });
      const darkResult = await screenshotComparison.compareScreenshots(
        testName,
        'theme-dark',
        darkScreenshot
      );
      screenshots.push({ name: 'dark', ...darkResult });

      // Click again to return to light theme
      await themeToggle.click();
      await page.waitForTimeout(1000);

      const lightScreenshot = await page.screenshot({ fullPage: false });
      const lightResult = await screenshotComparison.compareScreenshots(
        testName,
        'theme-light',
        lightScreenshot
      );
      screenshots.push({ name: 'light', ...lightResult });
    }

    const summary = screenshotComparison.getComparisonSummary(screenshots);

    const resultData = {
      timestamp: new Date().toISOString(),
      testName,
      browser: browserName,
      results: screenshots,
      summary,
      themesTested: screenshots.map(s => s.name)
    };

    fs.writeFileSync(
      path.join(RESULTS_DIR, `visual-theme-${testName}-${Date.now()}.json`),
      JSON.stringify(resultData, null, 2)
    );

    // Assertions
    expect(summary.passed).toBe(summary.total);
    expect(screenshots.length).toBeGreaterThan(0);
  });

  test('Visual Regression Summary Report', async ({ }) => {
    // Generate a comprehensive summary of all visual regression tests
    const resultFiles = fs.readdirSync(RESULTS_DIR)
      .filter(file => file.startsWith('visual-') && file.endsWith('.json'));

    const allResults = [];
    for (const file of resultFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        allResults.push(data);
      } catch (error) {
        console.warn(`Failed to parse visual result file ${file}:`, error);
      }
    }

    // Aggregate by test type
    const testTypes = ['baseline', 'interaction', 'responsive', 'theme'];
    const summaryByType = testTypes.map(type => {
      const typeResults = allResults.filter(r => r.testName.includes(type));
      const allComparisons = typeResults.flatMap(r => r.results || []);

      return {
        testType: type,
        testCount: typeResults.length,
        comparisonCount: allComparisons.length,
        passed: allComparisons.filter(c => c.passed).length,
        failed: allComparisons.filter(c => !c.passed).length,
        avgDifference: allComparisons.length > 0
          ? allComparisons.reduce((sum, c) => sum + c.differencePercentage, 0) / allComparisons.length
          : 0,
        maxDifference: allComparisons.length > 0
          ? Math.max(...allComparisons.map(c => c.differencePercentage))
          : 0
      };
    });

    // Aggregate by browser
    const browsers = ['chromium', 'firefox', 'webkit'];
    const summaryByBrowser = browsers.map(browser => {
      const browserResults = allResults.filter(r => r.browser === browser);
      const allComparisons = browserResults.flatMap(r => r.results || []);

      return {
        browser,
        testCount: browserResults.length,
        comparisonCount: allComparisons.length,
        passed: allComparisons.filter(c => c.passed).length,
        failed: allComparisons.filter(c => !c.passed).length,
        passRate: allComparisons.length > 0
          ? (allComparisons.filter(c => c.passed).length / allComparisons.length) * 100
          : 0
      };
    });

    const overallSummary = {
      timestamp: new Date().toISOString(),
      totalTestFiles: resultFiles.length,
      totalTests: allResults.length,
      totalComparisons: allResults.reduce((sum, r) => sum + (r.results?.length || 0), 0),
      overallPassed: allResults.reduce((sum, r) => sum + (r.summary?.passed || 0), 0),
      overallFailed: allResults.reduce((sum, r) => sum + (r.summary?.failed || 0), 0),
      byTestType: summaryByType,
      byBrowser: summaryByBrowser,
      config: visualConfig,
      recommendations: generateVisualRegressionRecommendations(summaryByType, summaryByBrowser)
    };

    fs.writeFileSync(
      path.join(RESULTS_DIR, `visual-regression-summary-${Date.now()}.json`),
      JSON.stringify(overallSummary, null, 2)
    );

    // Assertions for overall health
    expect(overallSummary.overallFailed).toBe(0); // No visual regressions allowed
    expect(overallSummary.totalComparisons).toBeGreaterThan(0); // Should have comparisons

    // At least 95% pass rate across all tests
    const overallPassRate = overallSummary.totalComparisons > 0
      ? (overallSummary.overallPassed / overallSummary.totalComparisons) * 100
      : 0;
    expect(overallPassRate).toBeGreaterThanOrEqual(95);
  });
});

function generateVisualRegressionRecommendations(
  byType: any[],
  byBrowser: any[]
): string[] {
  const recommendations: string[] = [];

  // Check for test type issues
  const failedTypes = byType.filter(t => t.failed > 0);
  if (failedTypes.length > 0) {
    recommendations.push(`Visual regressions detected in: ${failedTypes.map(t => t.testType).join(', ')}`);
  }

  // Check for browser-specific issues
  const lowPassRateBrowsers = byBrowser.filter(b => b.passRate < 90);
  if (lowPassRateBrowsers.length > 0) {
    recommendations.push(`Low visual consistency in browsers: ${lowPassRateBrowsers.map(b => b.browser).join(', ')}`);
  }

  // Check for high difference percentages
  const highDiffTests = byType.filter(t => t.maxDifference > 5); // >5% difference
  if (highDiffTests.length > 0) {
    recommendations.push(`High visual differences detected - consider updating baselines for: ${highDiffTests.map(t => t.testType).join(', ')}`);
  }

  // Check test coverage
  const lowCoverageTypes = byType.filter(t => t.testCount < 1);
  if (lowCoverageTypes.length > 0) {
    recommendations.push(`Missing visual tests for: ${lowCoverageTypes.map(t => t.testType).join(', ')}`);
  }

  return recommendations;
}

// Utility function to update baselines (can be called separately)
export async function updateVisualBaselines(): Promise<void> {
  const updateConfig: VisualRegressionConfig = {
    ...visualConfig,
    updateBaselines: true
  };

  const updater = new ScreenshotComparison(updateConfig);

  // Copy all current screenshots to baseline
  const currentFiles = fs.readdirSync(CURRENT_DIR);
  let updatedCount = 0;

  for (const file of currentFiles) {
    if (file.endsWith('-current.png')) {
      const testName = file.replace('-current.png', '').split('-').slice(0, -1).join('-');
      const screenshotName = file.replace('-current.png', '').split('-').pop() || 'unknown';

      if (updater.updateBaseline(testName, screenshotName)) {
        updatedCount++;
      }
    }
  }

  console.log(`Updated ${updatedCount} visual baselines`);
}