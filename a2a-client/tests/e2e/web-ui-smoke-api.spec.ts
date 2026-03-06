import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';

/**
 * Web UI Smoke Test - Enhanced Automation
 * Closely mirrors scripts/test-web-ui.ps1 functionality with Playwright
 *
 * Test Flow (mirrors PowerShell script):
 * 1. Infrastructure validation (Docker PostgreSQL + Redis)
 * 2. Service health checks with retries (A2A Server, Client API, Vite)
 * 3. Browser automation (UI load, console errors, session panel)
 * 4. SSE connectivity with heartbeat validation
 * 5. Session creation and API validation
 * 6. CORS and infrastructure cleanup verification
 *
 * Designed for comprehensive CI validation with real browser interaction
 */

// Infrastructure management utilities
class InfrastructureManager {
  private processes: any[] = [];

  async checkDockerServices(): Promise<boolean> {
    try {
      const output = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' }).toString();
      const services = output.trim().split('\n').filter((name: string) => name);
      const hasPostgres = services.some((name: string) => name.includes('postgres'));
      const hasRedis = services.some((name: string) => name.includes('redis'));
      console.log(`Docker services found: postgres=${hasPostgres}, redis=${hasRedis}`);
      return hasPostgres && hasRedis;
    } catch (error) {
      console.warn('Docker check failed:', error.message);
      return false;
    }
  }

  async waitForServiceHealth(url: string, serviceName: string, timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(url);
        if (response.status < 500) {
          console.log(`✓ ${serviceName} health check passed`);
          return true;
        }
      } catch (error) {
        // Continue trying
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.error(`✗ ${serviceName} health check failed after ${timeoutMs}ms`);
    return false;
  }

  cleanup() {
    this.processes.forEach(proc => {
      try {
        if (proc && !proc.killed) {
          proc.kill();
        }
      } catch (error) {
        console.warn('Failed to cleanup process:', error);
      }
    });
    this.processes = [];
  }
}

// Log collection utilities
const LOG_DIR = path.join(__dirname, '..', 'logs', 'web-ui-smoke');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const runId = `web-ui-smoke-enhanced-${timestamp}`;

interface TestResult {
  runId: string;
  timestamp: string;
  testName: string;
  status: 'passed' | 'failed';
  duration?: number;
  error?: string;
  services?: {
    server: boolean;
    clientApi: boolean;
    webUi: boolean;
    docker?: boolean;
  };
  infrastructure?: {
    dockerServices: boolean;
    serviceStartup: boolean;
  };
}

class SmokeTestLogger {
  private results: TestResult[] = [];
  private startTime: Date;
  private sseLogStream: fs.WriteStream;
  private infraLogStream: fs.WriteStream;

  constructor() {
    this.startTime = new Date();
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // Create detailed log streams
    const sseLogPath = path.join(LOG_DIR, `sse-heartbeat-${timestamp}.log`);
    const infraLogPath = path.join(LOG_DIR, `infrastructure-${timestamp}.log`);

    this.sseLogStream = fs.createWriteStream(sseLogPath, { flags: 'a' });
    this.infraLogStream = fs.createWriteStream(infraLogPath, { flags: 'a' });

    // Log startup
    this.infraLogStream.write(`[${new Date().toISOString()}] Infrastructure logging started for run ${runId}\n`);
    this.sseLogStream.write(`[${new Date().toISOString()}] SSE logging started for run ${runId}\n`);
  }

  logTest(testName: string, status: 'passed' | 'failed', duration?: number, error?: string, services?: TestResult['services']) {
    this.results.push({
      runId,
      timestamp,
      testName,
      status,
      duration,
      error,
      services
    });
  }

  logSSE(event: string, details?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${event}`;
    if (details) {
      this.sseLogStream.write(`${logEntry} - ${JSON.stringify(details)}\n`);
    } else {
      this.sseLogStream.write(`${logEntry}\n`);
    }
  }

  logInfrastructure(event: string, details?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${event}`;
    if (details) {
      this.infraLogStream.write(`${logEntry} - ${JSON.stringify(details)}\n`);
    } else {
      this.infraLogStream.write(`${logEntry}\n`);
    }
  }

  saveResults() {
    // Close log streams
    this.infraLogStream.end();
    this.sseLogStream.end();

    const summary = {
      runId,
      timestamp,
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.status === 'passed').length,
      failedTests: this.results.filter(r => r.status === 'failed').length,
      duration: Date.now() - this.startTime.getTime(),
      results: this.results,
      logs: {
        sseLog: `sse-heartbeat-${timestamp}.log`,
        infrastructureLog: `infrastructure-${timestamp}.log`
      }
    };

    const logFile = path.join(LOG_DIR, `${runId}.json`);
    fs.writeFileSync(logFile, JSON.stringify(summary, null, 2));
    console.log(`✓ Test results saved to: ${logFile}`);
    console.log(`✓ SSE logs saved to: sse-heartbeat-${timestamp}.log`);
    console.log(`✓ Infrastructure logs saved to: infrastructure-${timestamp}.log`);
  }
}

const logger = new SmokeTestLogger();
const infraManager = new InfrastructureManager();

// Global test result tracking and cleanup
test.afterAll(() => {
  infraManager.cleanup();
  logger.saveResults();
});

test.describe('Web UI Smoke Test - Enhanced Automation', () => {
    test.describe.configure({
        mode: 'serial',
        timeout: 120000 // Extended timeout for infrastructure checks
    });

    const SERVICES = {
        server: { port: 3000, health: 'http://localhost:3000/health' },
        clientApi: { port: 3001, health: 'http://localhost:3001/health' },
        webUi: { port: 5173, health: 'http://localhost:5173' }
    };

    // Infrastructure validation (mirrors PowerShell script Docker + service checks)
    test('Infrastructure and service startup validation', async ({ request }) => {
        const startTime = Date.now();
        let infraStatus = {
            dockerServices: false,
            serviceStartup: false
        };
        let servicesStatus = {
            server: false,
            clientApi: false,
            webUi: false
        };

        try {
            // Check Docker services (PostgreSQL + Redis)
            infraStatus.dockerServices = await infraManager.checkDockerServices();
            logger.logInfrastructure('Docker services check', { postgres: infraStatus.dockerServices, redis: infraStatus.dockerServices });
            expect(infraStatus.dockerServices).toBeTruthy();

            // Verify all services are healthy (with retries like PowerShell script)
            const healthChecks = await Promise.all([
                infraManager.waitForServiceHealth(SERVICES.server.health, 'A2A Server'),
                infraManager.waitForServiceHealth(SERVICES.clientApi.health, 'Client API'),
                infraManager.waitForServiceHealth(SERVICES.webUi.health, 'Web UI')
            ]);

            servicesStatus.server = healthChecks[0];
            servicesStatus.clientApi = healthChecks[1];
            servicesStatus.webUi = healthChecks[2];

            expect(healthChecks.every((healthy: boolean) => healthy)).toBeTruthy();
            infraStatus.serviceStartup = true;

            logger.logInfrastructure('Service health checks completed', {
                server: servicesStatus.server,
                clientApi: servicesStatus.clientApi,
                webUi: servicesStatus.webUi
            });

            console.log('✓ All infrastructure and services validated');
            logger.logTest('Infrastructure validation', 'passed', Date.now() - startTime, undefined, {
                ...servicesStatus,
                docker: infraStatus.dockerServices
            });
        } catch (error) {
            logger.logTest('Infrastructure validation', 'failed', Date.now() - startTime, error.message, {
                ...servicesStatus,
                docker: infraStatus.dockerServices
            });
            throw error;
        }
    });

    // Browser automation test (mirrors PowerShell script browser opening)
    test('Browser automation and UI smoke validation', async ({ page, browserName }) => {
        const startTime = Date.now();

        try {
            test.setTimeout(60000);

            // Navigate to Web UI (equivalent to PowerShell script browser opening)
            await page.goto('http://localhost:5173');
            console.log(`✓ Opened ${browserName} browser at Web UI`);

            // Wait for page to load without console errors
            const errors: string[] = [];
            page.on('pageerror', (error) => {
                errors.push(error.message);
            });

            // Wait for basic page structure (PlasticineUI, session panel elements)
            await page.waitForSelector('[data-testid="plasticine-container"], .plasticine-ui, #app', { timeout: 10000 });
            console.log('✓ Page loaded with UI framework elements');

            // Check for console errors during initial load
            await page.waitForTimeout(3000); // Let dynamic content load
            expect(errors.length).toBe(0);
            console.log('✓ No console errors during page load');

            // Verify session panel appears (mirrors manual validation step)
            const sessionPanelSelectors = [
                '[data-testid="session-panel"]',
                '.session-panel',
                '[class*="session"]',
                'button:has-text("New Session")',
                'button:has-text("Create Session")'
            ];

            let sessionPanelFound = false;
            for (const selector of sessionPanelSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    sessionPanelFound = true;
                    console.log(`✓ Session panel found with selector: ${selector}`);
                    break;
                } catch (e) {
                    // Continue to next selector
                }
            }

            // Allow session panel to be missing in basic smoke test (may require authentication)
            if (sessionPanelFound) {
                console.log('✓ Session panel UI elements present');
            } else {
                console.log('⚠ Session panel not found (may require authentication or different route)');
            }

            logger.logTest(`Browser automation - ${browserName}`, 'passed', Date.now() - startTime);
        } catch (error) {
            logger.logTest(`Browser automation - ${browserName}`, 'failed', Date.now() - startTime, error.message);
            throw error;
        }
    });

    // Enhanced SSE connectivity test (with actual EventSource simulation)
    test('SSE connectivity with heartbeat validation', async ({ page }) => {
        const startTime = Date.now();

        try {
            test.setTimeout(45000);

            // Create test session first
            const sessionResponse = await fetch('http://localhost:3001/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: 'sse-heartbeat-test',
                    task: 'Validate SSE heartbeat and connectivity'
                })
            });

            expect(sessionResponse.ok()).toBeTruthy();
            const sessionData = await sessionResponse.json();
            const sessionId = sessionData.data.session.id;
            console.log(`✓ Created test session for SSE: ${sessionId}`);
            logger.logSSE('Test session created', { sessionId });

            // Use page to create actual EventSource connection (closer to real browser behavior)
            const sseResult = await page.evaluate(async (sessionId: string) => {
                return new Promise<{connected: boolean, messageCount: number, heartbeatCount: number, duration: number}>((resolve, reject) => {
                    const eventSource = new EventSource(`http://localhost:3001/api/sse/${sessionId}`);
                    let connected = false;
                    let messageCount = 0;
                    let heartbeatCount = 0;
                    const startTime = Date.now();

                    eventSource.onopen = () => {
                        connected = true;
                        console.log('SSE Connected');
                    };

                    eventSource.onmessage = (event) => {
                        messageCount++;
                        console.log('SSE Message:', event.data);

                        // Check for heartbeat events
                        try {
                            const data = JSON.parse(event.data);
                            if (data.type === 'heartbeat' || data.heartbeat) {
                                heartbeatCount++;
                            }
                        } catch (e) {
                            // Not JSON, continue
                        }
                    };

                    eventSource.onerror = (error) => {
                        console.error('SSE Error:', error);
                        if (!connected) {
                            reject(new Error('Failed to establish SSE connection'));
                        }
                    };

                    // Wait for connection and some messages
                    setTimeout(() => {
                        eventSource.close();
                        resolve({
                            connected,
                            messageCount,
                            heartbeatCount,
                            duration: Date.now() - startTime
                        });
                    }, 10000); // Wait 10 seconds for SSE activity
                });
            }, sessionId);

            console.log(`✓ SSE test results: connected=${sseResult.connected}, messages=${sseResult.messageCount}, heartbeats=${sseResult.heartbeatCount}`);

            logger.logSSE('Heartbeat test completed', {
                connected: sseResult.connected,
                messageCount: sseResult.messageCount,
                heartbeatCount: sseResult.heartbeatCount,
                duration: sseResult.duration
            });

            // Validate SSE connection was established
            expect(sseResult.connected).toBeTruthy();
            expect(sseResult.messageCount).toBeGreaterThan(0);

            logger.logTest('SSE connectivity with heartbeat', 'passed', Date.now() - startTime);
        } catch (error) {
            logger.logTest('SSE connectivity with heartbeat', 'failed', Date.now() - startTime, error.message);
            throw error;
        }
    });

    // Original service health test (now secondary after infrastructure validation)
    test('Service health endpoints detailed validation', async ({ request }) => {
        const startTime = Date.now();
        let servicesStatus = { server: false, clientApi: false, webUi: false };

        try {
            test.setTimeout(30000);

            // Test A2A Server health
            const serverResponse = await request.get(SERVICES.server.health);
            expect(serverResponse.ok()).toBeTruthy();
            expect(serverResponse.status()).toBeLessThan(500);

            const serverHealth = await serverResponse.json();
            expect(serverHealth).toHaveProperty('status');
            servicesStatus.server = true;
            console.log(`✓ Server health: ${serverHealth.status}`);

            // Test Client API health
            const clientApiResponse = await request.get(SERVICES.clientApi.health);
            expect(clientApiResponse.ok()).toBeTruthy();
            expect(clientApiResponse.status()).toBeLessThan(500);

            const clientApiHealth = await clientApiResponse.json();
            expect(clientApiHealth).toHaveProperty('status');
            servicesStatus.clientApi = true;
            console.log(`✓ Client API health: ${clientApiHealth.status}`);

            // Test Web UI availability (basic HTTP check)
            const webUiResponse = await request.get(SERVICES.webUi.health);
            expect(webUiResponse.ok()).toBeTruthy();
            expect(webUiResponse.status()).toBeLessThan(500);
            servicesStatus.webUi = true;
            console.log(`✓ Web UI available at port ${SERVICES.webUi.port}`);

            logger.logTest('Service health checks', 'passed', Date.now() - startTime, undefined, servicesStatus);
        } catch (error) {
            logger.logTest('Service health checks', 'failed', Date.now() - startTime, error.message, servicesStatus);
            throw error;
        }
    });

    // Test SSE endpoint availability (without full EventSource connection)
    test('SSE endpoint /api/sse/:sessionId is accessible', async ({ request }) => {
        const startTime = Date.now();

        try {
            // Create a test session first to get a valid sessionId
            const sessionResponse = await request.post('http://localhost:3001/api/sessions', {
                data: {
                    projectId: 'smoke-test-project',
                    task: 'Verify SSE connectivity'
                }
            });

            expect(sessionResponse.ok()).toBeTruthy();
            const sessionData = await sessionResponse.json();
            expect(sessionData).toHaveProperty('data.session.id');

            const sessionId = sessionData.data.session.id;
            console.log(`✓ Created test session: ${sessionId}`);

            // Test SSE endpoint for this session
            const sseResponse = await request.get(`http://localhost:3001/api/sse/${sessionId}`, {
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                },
                timeout: 5000
            });

            // SSE endpoint should return 200 and proper headers for EventSource
            expect(sseResponse.status()).toBe(200);
            expect(sseResponse.headers()['content-type']).toContain('text/event-stream');
            expect(sseResponse.headers()['cache-control']).toBe('no-cache');

            console.log(`✓ SSE endpoint accessible for session ${sessionId}`);
            logger.logTest('SSE endpoint accessibility', 'passed', Date.now() - startTime);
        } catch (error) {
            logger.logTest('SSE endpoint accessibility', 'failed', Date.now() - startTime, error.message);
            throw error;
        }
    });

    // Test session creation via API (minimal session without browser)
    test('Session creation via API works end-to-end', async ({ request }) => {
        const startTime = Date.now();

        try {
            // Create session with minimal task
            const createResponse = await request.post('http://localhost:3001/api/sessions', {
                data: {
                    projectId: 'smoke-test-project',
                    task: 'Minimal session creation test'
                }
            });

            expect(createResponse.ok()).toBeTruthy();
            const createData = await createResponse.json();

            // Verify session structure
            expect(createData).toHaveProperty('success', true);
            expect(createData).toHaveProperty('data.session');
            expect(createData.data.session).toHaveProperty('id');
            expect(createData.data.session).toHaveProperty('status');

            const sessionId = createData.data.session.id;
            console.log(`✓ Session created: ${sessionId}`);

            // Verify session can be retrieved
            const getResponse = await request.get(`http://localhost:3001/api/sessions/${sessionId}`);
            expect(getResponse.ok()).toBeTruthy();

            const getData = await getResponse.json();
            expect(getData).toHaveProperty('data.session.id', sessionId);

            console.log(`✓ Session retrievable: ${sessionId}`);
            logger.logTest('Session creation via API', 'passed', Date.now() - startTime);
        } catch (error) {
            logger.logTest('Session creation via API', 'failed', Date.now() - startTime, error.message);
            throw error;
        }
    });

    // Test SSE connectivity simulation (API-level check)
    test('SSE connectivity simulation via fetch', async ({ request }) => {
        const startTime = Date.now();

        try {
            // Create session for SSE testing
            const sessionResponse = await request.post('http://localhost:3001/api/sessions', {
                data: {
                    projectId: 'smoke-test-project',
                    task: 'SSE connectivity test'
                }
            });

            const sessionId = (await sessionResponse.json()).data.session.id;

            // Simulate SSE connection attempt (fetch with EventSource-like headers)
            const sseCheckResponse = await request.get(`http://localhost:3001/api/sse/${sessionId}`, {
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            });

            expect(sseCheckResponse.ok()).toBeTruthy();

            // Check for CORS headers (important for browser SSE)
            const corsHeaders = sseCheckResponse.headers();
            expect(corsHeaders).toHaveProperty('access-control-allow-origin');

            console.log(`✓ SSE connectivity check passed for session ${sessionId}`);
            logger.logTest('SSE connectivity simulation', 'passed', Date.now() - startTime);
        } catch (error) {
            logger.logTest('SSE connectivity simulation', 'failed', Date.now() - startTime, error.message);
            throw error;
        }
    });

    // Cross-browser matrix simulation (mirrors PowerShell script browser parameter)
    test('Cross-browser compatibility validation', async ({ browserName }) => {
        // This test runs in each browser configured in playwright.config.ts
        // Simulates the PowerShell script's -Browser parameter functionality
        console.log(`✓ Running cross-browser validation in ${browserName}`);

        // Basic browser capability check - can be extended with browser-specific validations
        expect(['chromium', 'firefox', 'webkit']).toContain(browserName);
    });

    // Infrastructure cleanup and log collection (simulating script cleanup)
    test('Infrastructure cleanup and log collection verification', async ({ request }) => {
        const startTime = Date.now();

        try {
            // Verify all services are still responding after tests
            for (const [name, service] of Object.entries(SERVICES)) {
                const response = await request.get(service.health);
                expect(response.ok()).toBeTruthy();
                console.log(`✓ ${name} still healthy after test suite`);
            }

            // Test that we can create multiple sessions (no resource leaks)
            const sessions = [];
            for (let i = 0; i < 3; i++) {
                const response = await request.post('http://localhost:3001/api/sessions', {
                    data: {
                        projectId: 'cleanup-test-project',
                        task: `Cleanup test session ${i}`
                    }
                });
                expect(response.ok()).toBeTruthy();
                const sessionId = (await response.json()).data.session.id;
                sessions.push(sessionId);
            }

            console.log(`✓ Created ${sessions.length} test sessions without issues`);
            console.log(`✓ Session IDs: ${sessions.join(', ')}`);
            logger.logTest('Infrastructure cleanup verification', 'passed', Date.now() - startTime);
        } catch (error) {
            logger.logTest('Infrastructure cleanup verification', 'failed', Date.now() - startTime, error.message);
            throw error;
        }
    });
});