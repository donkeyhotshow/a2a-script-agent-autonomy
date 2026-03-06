import { test, expect } from '@playwright/test';
import { SSEInstrumentation } from './helpers/sse-instrumentation';
import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = 'tests/logs/sse-load-test';
const RESULTS_FILE = `test-results/sse-load-test-${Date.now()}.json`;

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

interface LoadTestResult {
  timestamp: string;
  concurrentConnections: number;
  duration: number;
  connectionsEstablished: number;
  connectionsFailed: number;
  messagesReceived: number;
  avgConnectionTime: number;
  peakMemoryUsage: number;
  errors: string[];
  logs: string[];
}

test.describe('SSE Load Testing', () => {
  test.setTimeout(300000); // 5 minutes for load tests

  test('Concurrent SSE Connections - Light Load (5 connections)', async ({ page, browser }) => {
    await runLoadTest(page, browser, 5, 30000); // 5 connections, 30 seconds
  });

  test('Concurrent SSE Connections - Medium Load (10 connections)', async ({ page, browser }) => {
    await runLoadTest(page, browser, 10, 45000); // 10 connections, 45 seconds
  });

  test('Concurrent SSE Connections - Heavy Load (20 connections)', async ({ page, browser }) => {
    await runLoadTest(page, browser, 20, 60000); // 20 connections, 60 seconds
  });

  test('SSE Connection Stress Test - Burst (50 connections)', async ({ page, browser }) => {
    await runLoadTest(page, browser, 50, 30000, true); // 50 connections, 30 seconds, burst mode
  });
});

async function runLoadTest(
  page: any,
  browser: any,
  concurrentConnections: number,
  duration: number,
  burstMode: boolean = false
): Promise<void> {
  const testId = `load-test-${concurrentConnections}-${Date.now()}`;
  const logs: string[] = [];
  const errors: string[] = [];
  let connectionsEstablished = 0;
  let connectionsFailed = 0;
  let messagesReceived = 0;
  const connectionTimes: number[] = [];

  const log = (message: string) => {
    const timestamped = `[${new Date().toISOString()}] ${message}`;
    console.log(timestamped);
    logs.push(timestamped);
  };

  log(`Starting SSE load test: ${concurrentConnections} connections, ${duration}ms duration`);

  // Create multiple browser contexts for concurrent connections
  const contexts = [];
  const pages = [];
  const instrumentations = [];

  try {
    // Initialize connections
    for (let i = 0; i < concurrentConnections; i++) {
      try {
        const startTime = Date.now();
        const context = await browser.newContext();
        const testPage = await context.newPage();

        contexts.push(context);
        pages.push(testPage);

        // Navigate to web UI
        await testPage.goto('http://localhost:5173', { timeout: 10000 });

        // Create session and get session ID
        const sessionResponse = await testPage.request.post('http://localhost:3001/api/sessions', {
          data: { name: `LoadTest-${i}` }
        });
        expect(sessionResponse.ok()).toBeTruthy();
        const sessionData = await sessionResponse.json();
        const sessionId = sessionData.id;

        // Initialize SSE instrumentation
        const instrumentation = new SSEInstrumentation(testPage, sessionId);
        instrumentations.push(instrumentation);

        // Start SSE connection
        await instrumentation.connect();

        const connectionTime = Date.now() - startTime;
        connectionTimes.push(connectionTime);
        connectionsEstablished++;

        log(`Connection ${i + 1}/${concurrentConnections} established in ${connectionTime}ms`);

        // Add small delay between connections unless burst mode
        if (!burstMode && i < concurrentConnections - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        connectionsFailed++;
        const errorMsg = `Connection ${i + 1} failed: ${error.message}`;
        log(errorMsg);
        errors.push(errorMsg);
      }
    }

    log(`All connections attempted. Established: ${connectionsEstablished}, Failed: ${connectionsFailed}`);

    // Monitor connections during test duration
    const monitoringStart = Date.now();
    let messageCount = 0;

    while (Date.now() - monitoringStart < duration) {
      // Check connection health every 5 seconds
      for (let i = 0; i < instrumentations.length; i++) {
        try {
          const status = await instrumentations[i].getConnectionStatus();
          if (status.connected) {
            const messages = await instrumentations[i].getMessageCount();
            messageCount += messages;
          }
        } catch (error) {
          log(`Connection ${i + 1} health check failed: ${error.message}`);
        }
      }

      // Send test messages to keep connections alive
      for (let i = 0; i < Math.min(instrumentations.length, 3); i++) {
        try {
          await instrumentations[i].sendTestMessage(`Load test message ${Date.now()}`);
        } catch (error) {
          log(`Failed to send test message on connection ${i + 1}: ${error.message}`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
    }

    messagesReceived = messageCount;

    // Collect memory usage
    let peakMemoryUsage = 0;
    for (const testPage of pages) {
      try {
        const metrics = await testPage.evaluate(() => {
          // @ts-ignore
          if (performance.memory) {
            // @ts-ignore
            return performance.memory.usedJSHeapSize;
          }
          return 0;
        });
        peakMemoryUsage = Math.max(peakMemoryUsage, metrics);
      } catch (error) {
        log(`Failed to collect memory metrics: ${error.message}`);
      }
    }

    // Calculate averages
    const avgConnectionTime = connectionTimes.length > 0
      ? connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length
      : 0;

    const result: LoadTestResult = {
      timestamp: new Date().toISOString(),
      concurrentConnections,
      duration,
      connectionsEstablished,
      connectionsFailed,
      messagesReceived,
      avgConnectionTime,
      peakMemoryUsage,
      errors,
      logs
    };

    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(LOG_DIR, `${testId}.log`), logs.join('\n'));

    log(`Load test completed. Results saved to ${RESULTS_FILE}`);

    // Assertions
    expect(connectionsEstablished).toBeGreaterThan(0);
    expect(connectionsFailed).toBeLessThan(concurrentConnections * 0.5); // Less than 50% failure rate

  } finally {
    // Cleanup
    for (const instrumentation of instrumentations) {
      try {
        await instrumentation.disconnect();
      } catch (error) {
        log(`Error disconnecting: ${error.message}`);
      }
    }

    for (const context of contexts) {
      try {
        await context.close();
      } catch (error) {
        log(`Error closing context: ${error.message}`);
      }
    }
  }
}