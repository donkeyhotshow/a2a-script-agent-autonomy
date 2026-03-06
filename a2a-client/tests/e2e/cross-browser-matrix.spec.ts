import { test, expect } from '@playwright/test';

/**
 * Cross-browser stability matrix tests
 * Tests UI behavior across different browsers, viewports, and SSE load states
 */

const VIEWPORT_MATRIX = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

const SSE_LOAD_SCENARIOS = [
  { name: 'idle', description: 'No active SSE connections' },
  { name: 'normal', description: 'Regular SSE message flow' },
  { name: 'high-load', description: 'High-frequency SSE events' },
];

test.describe('Cross-browser Stability Matrix', () => {
  for (const viewport of VIEWPORT_MATRIX) {
    test.describe(`Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      for (const scenario of SSE_LOAD_SCENARIOS) {
        test.describe(`SSE Load: ${scenario.name}`, () => {
          test.beforeEach(async ({ page }) => {
            // Set up SSE load scenario
            await page.addInitScript(() => {
              // Mock different SSE load patterns
              window.testSSEScenario = scenario.name;

              if (scenario.name === 'high-load') {
                // Simulate high-frequency SSE events
                let eventCount = 0;
                setInterval(() => {
                  window.dispatchEvent(new CustomEvent('sse-message', {
                    detail: { type: 'progress', count: eventCount++ }
                  }));
                }, 100); // 10 events per second
              }
            });

            await page.goto('/');
            await page.waitForLoadState('networkidle');
          });

          test('UI loads without crashes', async ({ page }) => {
            // Basic smoke test - page should load
            await expect(page).toHaveTitle(/A2A/);

            // Check for critical UI elements
            await expect(page.locator('[data-testid="session-panel"]')).toBeVisible();

            // No console errors
            const errors = [];
            page.on('console', msg => {
              if (msg.type() === 'error') {
                errors.push(msg.text());
              }
            });

            await page.waitForTimeout(2000);
            expect(errors).toHaveLength(0);
          });

          test('Session panel responsive layout', async ({ page }) => {
            const panel = page.locator('[data-testid="session-panel"]');

            // Panel should be visible and properly sized
            await expect(panel).toBeVisible();
            const box = await panel.boundingBox();
            expect(box?.width).toBeGreaterThan(100);
            expect(box?.height).toBeGreaterThan(100);

            // Layout should adapt to viewport
            if (viewport.name === 'mobile') {
              // Mobile layout checks
              await expect(panel).toHaveCSS('max-width', '100vw');
            } else {
              // Desktop/tablet layout checks
              await expect(panel).toHaveCSS('position', 'relative');
            }
          });

          test('SSE connection stability', async ({ page }) => {
            // Wait for SSE connection indicator
            const sseIndicator = page.locator('[data-testid="sse-status"]');
            await expect(sseIndicator).toBeVisible();

            // Check connection status
            await expect(sseIndicator).toHaveAttribute('data-status', /(connected|connecting)/);

            // Monitor for disconnections during load
            let disconnectCount = 0;
            page.on('console', msg => {
              if (msg.text().includes('SSE connection lost')) {
                disconnectCount++;
              }
            });

            // Run for 10 seconds under load
            await page.waitForTimeout(10000);

            // Allow max 2 disconnections for high-load scenario
            if (scenario.name === 'high-load') {
              expect(disconnectCount).toBeLessThanOrEqual(2);
            } else {
              expect(disconnectCount).toBe(0);
            }
          });

          test('Memory usage stability', async ({ page }) => {
            // Track memory usage over time
            const memoryReadings = [];

            for (let i = 0; i < 5; i++) {
              const metrics = await page.metrics();
              memoryReadings.push(metrics.JSHeapUsedSize);
              await page.waitForTimeout(2000);
            }

            // Memory should not grow excessively
            const initialMemory = memoryReadings[0];
            const finalMemory = memoryReadings[memoryReadings.length - 1];
            const growthPercent = ((finalMemory - initialMemory) / initialMemory) * 100;

            // Allow max 50% growth during normal operation
            expect(growthPercent).toBeLessThan(50);
          });

          test('Interaction responsiveness', async ({ page }) => {
            // Test button clicks and form interactions
            const createSessionBtn = page.locator('[data-testid="create-session-btn"]');

            if (await createSessionBtn.isVisible()) {
              const startTime = Date.now();
              await createSessionBtn.click();
              const endTime = Date.now();

              // Click should respond within 500ms
              expect(endTime - startTime).toBeLessThan(500);
            }
          });
        });
      }
    });
  }
});

test.describe('Browser-specific behaviors', () => {
  test('Firefox - WebGL support', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');

    // Test WebGL availability (used by VueFlow)
    const hasWebGL = await page.evaluate(() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch {
        return false;
      }
    });

    expect(hasWebGL).toBe(true);
  });

  test('WebKit - Touch events', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'WebKit-specific test');

    // Test touch event handling
    await page.setViewportSize({ width: 375, height: 667 });

    const touchSupported = await page.evaluate(() => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    });

    expect(touchSupported).toBe(true);
  });

  test('Mobile browsers - Viewport meta tag', async ({ page }) => {
    // Check viewport meta tag for mobile browsers
    const viewportMeta = await page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
  });
});