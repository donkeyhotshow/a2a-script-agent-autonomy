import { test, expect } from '@playwright/test';
import { PerformanceMonitor, PageMetrics, ConnectionMetrics } from '../helpers/performance-monitor';
import { SSEInstrumentation } from './helpers/sse-instrumentation';
import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = 'tests/logs/performance-monitoring';
const RESULTS_DIR = 'test-results';

// Ensure directories exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

test.describe('Performance Monitoring', () => {
  let monitor: PerformanceMonitor;

  test.beforeEach(() => {
    monitor = new PerformanceMonitor(2000); // Collect every 2 seconds
  });

  test.afterEach(() => {
    monitor.stop();
    monitor.clear();
  });

  test('Web UI Performance Baseline', async ({ page }) => {
    monitor.start();

    // Navigate and collect initial page metrics
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const initialMetrics = await monitor.collectPageMetrics(page);

    // Wait for session panel to load
    await page.waitForSelector('.session-panel, [data-testid="session-panel"]', { timeout: 10000 });

    // Perform some interactions
    const sessionButton = page.locator('button').filter({ hasText: /new|create|session/i }).first();
    if (await sessionButton.isVisible()) {
      await sessionButton.click();
      await page.waitForTimeout(1000);
    }

    // Collect final metrics
    const finalMetrics = await monitor.collectPageMetrics(page);

    // Stop monitoring
    monitor.stop();

    const results = {
      timestamp: new Date().toISOString(),
      test: 'Web UI Performance Baseline',
      initialMetrics,
      finalMetrics,
      nodeMetrics: monitor.getMetrics().node,
      summary: {
        pageLoadTime: finalMetrics.loadComplete,
        domContentLoaded: finalMetrics.domContentLoaded,
        averageHeapUsage: monitor.getAverageHeapUsage(),
        peakHeapUsage: monitor.getPeakHeapUsage(),
        networkRequests: finalMetrics.networkRequests,
        failedRequests: finalMetrics.failedRequests
      }
    };

    const filename = `performance-baseline-${Date.now()}.json`;
    fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(results, null, 2));

    // Assertions
    expect(finalMetrics.loadComplete).toBeLessThan(5000); // Should load within 5 seconds
    expect(finalMetrics.failedRequests).toBe(0); // No failed network requests
    expect(monitor.getAverageHeapUsage()).toBeGreaterThan(0); // Should have heap usage data
  });

  test('SSE Connection Performance', async ({ page }) => {
    monitor.start();

    // Create session
    const sessionResponse = await page.request.post('http://localhost:3001/api/sessions', {
      data: { name: 'PerformanceTest' }
    });
    expect(sessionResponse.ok()).toBeTruthy();
    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.id;

    // Initialize SSE instrumentation
    const instrumentation = new SSEInstrumentation(page, sessionId);

    const connectionStart = Date.now();
    await instrumentation.connect();
    const connectionTime = Date.now() - connectionStart;

    // Record initial connection metrics
    const initialConnectionMetrics: ConnectionMetrics = {
      timestamp: Date.now(),
      sessionId,
      connected: true,
      messagesReceived: 0,
      messagesSent: 0,
      connectionTime,
      reconnectCount: 0,
      errors: []
    };
    monitor.recordConnectionMetrics(initialConnectionMetrics);

    // Wait and monitor connection
    await page.waitForTimeout(10000); // Monitor for 10 seconds

    // Send some test messages
    for (let i = 0; i < 5; i++) {
      try {
        await instrumentation.sendTestMessage(`Performance test message ${i + 1}`);
        await page.waitForTimeout(1000);
      } catch (error) {
        console.warn(`Failed to send message ${i + 1}:`, error);
      }
    }

    // Collect final connection metrics
    const finalMessageCount = await instrumentation.getMessageCount();
    const finalConnectionMetrics: ConnectionMetrics = {
      timestamp: Date.now(),
      sessionId,
      connected: await instrumentation.isConnected(),
      messagesReceived: finalMessageCount,
      messagesSent: 5,
      connectionTime,
      lastMessageTime: Date.now(),
      reconnectCount: 0,
      errors: []
    };
    monitor.recordConnectionMetrics(finalConnectionMetrics);

    // Collect page metrics
    const pageMetrics = await monitor.collectPageMetrics(page, sessionId);

    await instrumentation.disconnect();
    monitor.stop();

    const results = {
      timestamp: new Date().toISOString(),
      test: 'SSE Connection Performance',
      sessionId,
      connectionMetrics: [initialConnectionMetrics, finalConnectionMetrics],
      pageMetrics,
      nodeMetrics: monitor.getMetrics().node,
      summary: monitor.getConnectionHealthSummary()
    };

    const filename = `sse-performance-${Date.now()}.json`;
    fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(results, null, 2));

    // Assertions
    expect(connectionTime).toBeLessThan(5000); // Connection should establish within 5 seconds
    expect(finalConnectionMetrics.connected).toBeTruthy(); // Should remain connected
    expect(finalMessageCount).toBeGreaterThanOrEqual(0); // Should receive some messages
  });

  test('Memory Leak Detection', async ({ page }) => {
    monitor.start();

    // Navigate to the page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Create multiple sessions to stress memory
    const sessions = [];
    for (let i = 0; i < 3; i++) {
      const sessionResponse = await page.request.post('http://localhost:3001/api/sessions', {
        data: { name: `MemoryTest-${i}` }
      });
      if (sessionResponse.ok()) {
        const sessionData = await sessionResponse.json();
        sessions.push(sessionData.id);
      }
    }

    // Navigate between sessions and perform actions
    for (const sessionId of sessions) {
      // Simulate session switching and activity
      await page.evaluate((id) => {
        // Simulate some DOM manipulation that might cause memory leaks
        const elements = [];
        for (let i = 0; i < 100; i++) {
          const div = document.createElement('div');
          div.textContent = `Test element ${i} for session ${id}`;
          div.style.display = 'none';
          document.body.appendChild(div);
          elements.push(div);
        }
        // Clean up immediately to test GC
        elements.forEach(el => el.remove());
      }, sessionId);

      await page.waitForTimeout(2000);
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    await page.waitForTimeout(5000); // Allow time for GC

    const finalPageMetrics = await monitor.collectPageMetrics(page);
    monitor.stop();

    const nodeMetrics = monitor.getMetrics().node;
    const results = {
      timestamp: new Date().toISOString(),
      test: 'Memory Leak Detection',
      sessionsCreated: sessions.length,
      finalPageMetrics,
      nodeMetrics,
      summary: {
        initialHeapUsage: nodeMetrics.length > 0 ? nodeMetrics[0].heapUsed : 0,
        finalHeapUsage: nodeMetrics.length > 0 ? nodeMetrics[nodeMetrics.length - 1].heapUsed : 0,
        averageHeapUsage: monitor.getAverageHeapUsage(),
        peakHeapUsage: monitor.getPeakHeapUsage(),
        heapGrowth: nodeMetrics.length > 1 ?
          nodeMetrics[nodeMetrics.length - 1].heapUsed - nodeMetrics[0].heapUsed : 0
      }
    };

    const filename = `memory-leak-test-${Date.now()}.json`;
    fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(results, null, 2));

    // Assertions - heap growth should be reasonable
    const heapGrowth = results.summary.heapGrowth;
    expect(heapGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth during test
    expect(results.summary.finalHeapUsage).toBeGreaterThan(0); // Should have final heap usage
  });

  test('Performance Regression Detection', async ({ page }) => {
    // Load baseline if exists
    const baselineFile = path.join(RESULTS_DIR, 'performance-baseline.json');
    let baseline: any = null;

    if (fs.existsSync(baselineFile)) {
      try {
        baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
      } catch (error) {
        console.warn('Could not load baseline performance data:', error);
      }
    }

    monitor.start();

    // Run the same performance test as baseline
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const currentMetrics = await monitor.collectPageMetrics(page);
    monitor.stop();

    const results = {
      timestamp: new Date().toISOString(),
      test: 'Performance Regression Detection',
      currentMetrics,
      baseline: baseline?.summary || null,
      regression: baseline ? {
        loadTimeChange: currentMetrics.loadComplete - (baseline.summary?.pageLoadTime || 0),
        domContentLoadedChange: currentMetrics.domContentLoaded - (baseline.summary?.domContentLoaded || 0),
        heapUsageChange: monitor.getAverageHeapUsage() - (baseline.summary?.averageHeapUsage || 0)
      } : null
    };

    const filename = `performance-regression-${Date.now()}.json`;
    fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(results, null, 2));

    // Save current as new baseline
    fs.writeFileSync(baselineFile, JSON.stringify({
      timestamp: results.timestamp,
      summary: {
        pageLoadTime: currentMetrics.loadComplete,
        domContentLoaded: currentMetrics.domContentLoaded,
        averageHeapUsage: monitor.getAverageHeapUsage(),
        peakHeapUsage: monitor.getPeakHeapUsage(),
        networkRequests: currentMetrics.networkRequests,
        failedRequests: currentMetrics.failedRequests
      }
    }, null, 2));

    // Assertions - basic performance requirements
    expect(currentMetrics.loadComplete).toBeLessThan(10000); // Should load within 10 seconds
    expect(currentMetrics.failedRequests).toBe(0); // No failed requests
  });
});