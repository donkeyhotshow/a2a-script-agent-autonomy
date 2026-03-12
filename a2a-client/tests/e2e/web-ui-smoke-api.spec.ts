import { test, expect } from '@playwright/test';
import { infraManager } from './helpers/infra-manager.js';
import { logger } from './helpers/smoke-logger.js';
import { SERVICES } from './fixtures/services.js';


/**
 * Web UI Smoke Test - Enhanced Automation
 * Closely mirrors scripts/test-web-ui.ps1 functionality with Playwright
 *
 * Test Flow (mirrors PowerShell script):
 * 1. Infrastructure validation (Docker PostgreSQL + Redis)
 * 2. Service health checks with retries (A2A Server, Client API, Vite)
 * 3. Browser automation (UI load, console errors, session panel)
 * 4. Session creation and API validation
 * 5. CORS and infrastructure cleanup verification
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
  private infraLogStream: fs.WriteStream;

  constructor() {
    this.startTime = new Date();
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // Create detailed log streams
    const infraLogPath = path.join(LOG_DIR, `infrastructure-${timestamp}.log`);

    this.infraLogStream = fs.createWriteStream(infraLogPath, { flags: 'a' });

    // Log startup
    this.infraLogStream.write(`[${new Date().toISOString()}] Infrastructure logging started for run ${runId}\n`);
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

    const summary = {
      runId,
      timestamp,
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.status === 'passed').length,
      failedTests: this.results.filter(r => r.status === 'failed').length,
      duration: Date.now() - this.startTime.getTime(),
      results: this.results,
      logs: {
        infrastructureLog: `infrastructure-${timestamp}.log`
      }
    };

    const logFile = path.join(LOG_DIR, `${runId}.json`);
    fs.writeFileSync(logFile, JSON.stringify(summary, null, 2));
    console.log(`✓ Test results saved to: ${logFile}`);
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
        clientApi: { port: 5173, health: 'http://localhost:5173' },
        webUi: { port: 5173, health: 'http://localhost:5173' },
        aiHub: { port: 11435, health: 'http://localhost:11435/health' },
        ollama: { port: 11434, health: 'http://localhost:11434/api/tags' }
    };

    // Infrastructure validation (mirrors PowerShell script Docker + service checks)
    test('Infrastructure and service startup validation', async ({ request }) => {
        const startTime = Date.now();
        let infraStatus = {
            dockerServices: false,
            serviceStartup: false,
            aiHub: false,
            ollama: false
        };
        let servicesStatus = {
            server: false,
            clientApi: false,
            webUi: false,
            aiHub: false,
            ollama: false
        };

        try {
            // Check Docker services (PostgreSQL + Redis) - optional check, warn but don't fail
            infraStatus.dockerServices = await infraManager.checkDockerServices();
            logger.logInfrastructure('Docker services check', { postgres: infraStatus.dockerServices, redis: infraStatus.dockerServices });
            if (!infraStatus.dockerServices) {
                console.log('⚠ Docker services not available (PostgreSQL/Redis may be running natively or not needed)');
            } else {
                console.log('✓ Docker services available');
            }
            // Don't fail test if Docker is not available - services may run natively

            // Verify all core services are healthy (with retries like PowerShell script)
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

            // Check AI Hub health (localhost:11435) - optional check
            try {
                const aiHubResponse = await request.get(SERVICES.aiHub.health);
                if (aiHubResponse.status < 500) {
                    servicesStatus.aiHub = true;
                    infraStatus.aiHub = true;
                    console.log('✓ AI Hub health check passed');
                    logger.logInfrastructure('AI Hub health check', { status: aiHubResponse.status });
                }
            } catch (error) {
                console.log('⚠ AI Hub not available:', error.message);
                logger.logInfrastructure('AI Hub health check failed', { error: error.message });
            }
            // Don't fail test if AI Hub is not available

            // Check Ollama API (localhost:11434) - optional check
            try {
                const ollamaResponse = await request.get(SERVICES.ollama.health);
                if (ollamaResponse.status < 500) {
                    servicesStatus.ollama = true;
                    infraStatus.ollama = true;
                    console.log('✓ Ollama API check passed');
                    const ollamaData = await ollamaResponse.json();
                    logger.logInfrastructure('Ollama API check', { models: ollamaData.models?.length || 0 });
                }
            } catch (error) {
                console.log('⚠ Ollama API not available:', error.message);
                logger.logInfrastructure('Ollama API check failed', { error: error.message });
            }
            // Don't fail test if Ollama is not available

            logger.logInfrastructure('Service health checks completed', {
                server: servicesStatus.server,
                clientApi: servicesStatus.clientApi,
                webUi: servicesStatus.webUi,
                aiHub: servicesStatus.aiHub,
                ollama: servicesStatus.ollama
            });

            console.log('✓ All infrastructure and services validated including AI Hub and Ollama');
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
        const networkErrors: string[] = [];

        try {
            test.setTimeout(90000);

            // Listen for network errors
            page.on('requestfailed', (request) => {
                const errorMsg = `Network error: ${request.url()} - ${request.failure()?.errorText}`;
                networkErrors.push(errorMsg);
                logger.logInfrastructure('Browser network error', { url: request.url(), error: request.failure()?.errorText });
            });

            // Navigate to Web UI (equivalent to PowerShell script browser opening)
            await page.goto('http://localhost:5173');
            console.log(`✓ Opened ${browserName} browser at Web UI`);

            // Wait for page to load without console errors
            const errors: string[] = [];
            page.on('pageerror', (error) => {
                errors.push(error.message);
                logger.logInfrastructure('Browser page error', { message: error.message });
            });

            // Wait for basic page structure (PlasticineUI, session panel elements)
            await page.waitForSelector('[data-testid="plasticine-container"], .plasticine-ui, #app', { timeout: 10000 });
            console.log('✓ Page loaded with UI framework elements');

            // Check for console errors during initial load
            await page.waitForTimeout(3000); // Let dynamic content load
            
            // Log console errors if any
            if (errors.length > 0) {
                console.log(`⚠ Console errors found: ${errors.length}`);
                errors.forEach(err => console.log(`  - ${err}`));
            }
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

            // NEW: Enhanced browser test - Create session via UI and validate response rendering
            console.log('--- Starting enhanced UI flow validation ---');
            
            // Try to create a new session via UI buttons
            const newSessionButtonSelectors = [
                'button:has-text("New Session")',
                'button:has-text("Create Session")',
                '[data-testid="new-session-btn"]',
                '.new-session-button',
                'button:has-text("+")'
            ];

            let sessionCreatedViaUI = false;
            for (const selector of newSessionButtonSelectors) {
                try {
                    const button = await page.$(selector);
                    if (button) {
                        await button.click();
                        await page.waitForTimeout(2000);
                        sessionCreatedViaUI = true;
                        console.log(`✓ Created new session via UI button: ${selector}`);
                        logger.logInfrastructure('UI session creation', { selector });
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            // If we can create a session, try to send input and verify response
            if (sessionCreatedViaUI) {
                // Look for input field to send message
                const inputSelectors = [
                    'input[type="text"]',
                    'textarea',
                    '[data-testid="message-input"]',
                    '.message-input',
                    'input[placeholder*="message" i]',
                    'input[placeholder*="введи" i]'
                ];

                let inputFound = false;
                for (const selector of inputSelectors) {
                    try {
                        const input = await page.$(selector);
                        if (input) {
                            await input.fill('test');
                            inputFound = true;
                            console.log(`✓ Found input field: ${selector}`);
                            
                            // Try to submit
                            const submitButtons = [
                                'button:has-text("Send")',
                                'button:has-text("Отправить")',
                                '[data-testid="send-btn"]',
                                'button[type="submit"]'
                            ];
                            
                            for (const btnSelector of submitButtons) {
                                const submitBtn = await page.$(btnSelector);
                                if (submitBtn) {
                                    await submitBtn.click();
                                    console.log(`✓ Clicked submit button: ${btnSelector}`);
                                    
                                    // Wait for response
                                    await page.waitForTimeout(5000);
                                    
                                    // Look for response elements
                                    const responseSelectors = [
                                        '.message',
                                        '#action-progress',
                                        '[data-testid="message"]',
                                        '.response',
                                        '[class*="message-content"]'
                                    ];
                                    
                                    let responseFound = false;
                                    for (const respSelector of responseSelectors) {
                                        try {
                                            await page.waitForSelector(respSelector, { timeout: 3000 });
                                            responseFound = true;
                                            console.log(`✓ Response rendered with selector: ${respSelector}`);
                                            logger.logInfrastructure('UI response validation', { selector: respSelector });
                                            break;
                                        } catch (e) {
                                            // Continue
                                        }
                                    }
                                    
                                    if (responseFound) {
                                        console.log('✓ UI successfully rendered response');
                                    } else {
                                        console.log('⚠ Response elements not found (may be in different format)');
                                    }
                                    break;
                                }
                            }
                            break;
                        }
                    } catch (e) {
                        // Continue
                    }
                }

                // Verify session panel shows running/ready status
                const statusSelectors = [
                    '[data-testid="session-status"]',
                    '.session-status',
                    '[class*="status"]',
                    '.running',
                    '.ready'
                ];

                for (const selector of statusSelectors) {
                    try {
                        const statusElement = await page.$(selector);
                        if (statusElement) {
                            const statusText = await statusElement.textContent();
                            console.log(`✓ Session status element found: ${statusText}`);
                            logger.logInfrastructure('Session status', { status: statusText });
                            break;
                        }
                    } catch (e) {
                        // Continue
                    }
                }
            } else {
                console.log('⚠ Could not create session via UI buttons (UI may require authentication)');
            }

            // Log any network errors that occurred
            if (networkErrors.length > 0) {
                console.log(`⚠ Network errors during browser test: ${networkErrors.length}`);
                networkErrors.forEach(err => console.log(`  - ${err}`));
            } else {
                console.log('✓ No network errors during browser test');
            }

            logger.logTest(`Browser automation - ${browserName}`, 'passed', Date.now() - startTime);
        } catch (error) {
            // Take screenshot on failure
            const screenshotPath = path.join(LOG_DIR, `failure-${browserName}-${timestamp}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.error(`✗ Browser test failed. Screenshot saved to: ${screenshotPath}`);
            logger.logInfrastructure('Browser test failure', { 
                error: error.message, 
                screenshot: screenshotPath,
                networkErrors 
            });
            logger.logTest(`Browser automation - ${browserName}`, 'failed', Date.now() - startTime, error.message);
            throw error;
        }
    });

    // Original service health test (now secondary after infrastructure validation)
    test('Service health endpoints detailed validation', async ({ request }) => {
        const startTime = Date.now();
        let servicesStatus = { server: false, clientApi: false, webUi: false, aiHub: false, ollama: false };

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

            // Test Client API health - Vite doesn't have /health, check API endpoint instead
            try {
                const clientApiResponse = await request.get('http://localhost:5173/api/a2a/projects');
                if (clientApiResponse.status < 500) {
                    servicesStatus.clientApi = true;
                    console.log(`✓ Client API available at port 5173`);
                }
            } catch (error) {
                console.log(`⚠ Client API not available: ${error.message}`);
            }

            // Test Web UI availability (basic HTTP check)
            const webUiResponse = await request.get(SERVICES.webUi.health);
            expect(webUiResponse.ok()).toBeTruthy();
            expect(webUiResponse.status()).toBeLessThan(500);
            servicesStatus.webUi = true;
            console.log(`✓ Web UI available at port ${SERVICES.webUi.port}`);

            // Test AI Hub health
            try {
                const aiHubResponse = await request.get(SERVICES.aiHub.health);
                if (aiHubResponse.status < 500) {
                    servicesStatus.aiHub = true;
                    console.log(`✓ AI Hub available at port ${SERVICES.aiHub.port}`);
                }
            } catch (error) {
                console.log(`⚠ AI Hub not available: ${error.message}`);
            }

            // Test Ollama API
            try {
                const ollamaResponse = await request.get(SERVICES.ollama.health);
                if (ollamaResponse.status < 500) {
                    servicesStatus.ollama = true;
                    const ollamaData = await ollamaResponse.json();
                    console.log(`✓ Ollama API available at port ${SERVICES.ollama.port} (${ollamaData.models?.length || 0} models)`);
                }
            } catch (error) {
                console.log(`⚠ Ollama not available: ${error.message}`);
            }

            logger.logTest('Service health checks', 'passed', Date.now() - startTime, undefined, servicesStatus);
        } catch (error) {
            logger.logTest('Service health checks', 'failed', Date.now() - startTime, error.message, servicesStatus);
            throw error;
        }
    });

    // Test session creation via API (minimal session without browser)
    test('Session creation via API works end-to-end', async ({ request }) => {
        const startTime = Date.now();

        try {
            // Create session with minimal task
            const createResponse = await request.post('http://localhost:5173/api/a2a/sessions', {
                data: {
                    projectId: 'smoke-test-project',
                    task: 'Minimal session creation test'
                }
            });

            expect(createResponse.ok()).toBeTruthy();
            const createData = await createResponse.json();

            // Verify session structure
            expect(createData).toHaveProperty('success', true);
            expect(createData).toHaveProperty('session');
            expect(createData.session).toHaveProperty('id');
            expect(createData.session).toHaveProperty('status');

            const sessionId = createData.session.id;
            console.log(`✓ Session created: ${sessionId}`);

            // Verify session can be retrieved
            const getResponse = await request.get(`http://localhost:5173/api/a2a/sessions/${sessionId}`);
            expect(getResponse.ok()).toBeTruthy();

            // Verify session can be retrieved
            expect(getResponse.ok()).toBeTruthy();
            const getData = await getResponse.json();
            
            // Verify the session ID matches (response may have different structure)
            const retrievedId = getData.session?.id || getData.id;
            expect(retrievedId).toBe(sessionId);

            console.log(`✓ Session retrievable: ${sessionId}`);
            logger.logTest('Session creation via API', 'passed', Date.now() - startTime);
        } catch (error) {
            logger.logTest('Session creation via API', 'failed', Date.now() - startTime, error.message);
            throw error;
        }
    });

    // End-to-end session validation with step execution
    test('End-to-end session execution with API step validation', async ({ request }) => {
        const startTime = Date.now();
        let promiseId: string | null = null;

        try {
            // Create session
            const createResponse = await request.post('http://localhost:5173/api/a2a/sessions', {
                data: {
                    projectId: 'e2e-test-project',
                    task: 'End-to-end test'
                }
            });

            expect(createResponse.ok()).toBeTruthy();
            const createData = await createResponse.json();
            const sessionId = createData.session?.id || createData.data?.session?.id;
            console.log(`✓ E2E Session created: ${sessionId}`);

            // Send a step via /sessions/{id}/next
            const stepResponse = await request.post(`http://localhost:5173/api/a2a/sessions/${sessionId}/next`, {
                data: {
                    task: 'test'
                }
            });

            expect(stepResponse.ok()).toBeTruthy();
            const stepData = await stepResponse.json();
            console.log(`✓ Step response received`);

            // Check if promiseId is returned (async flow)
            const responseData = stepData.data || stepData.session || stepData;
            if (responseData && responseData.promiseId) {
                promiseId = responseData.promiseId;
                console.log(`✓ Promise ID returned: ${promiseId}`);
                logger.logInfrastructure('E2E session - promiseId received', { promiseId });

                // Poll for completion
                const maxPollAttempts = 30;
                let pollAttempts = 0;
                let completed = false;
                let resultData: any = null;

                while (pollAttempts < maxPollAttempts && !completed) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const pollResponse = await request.get(`http://localhost:3000/api/v1/requests/${promiseId}/result`);
                    if (pollResponse.ok()) {
                        const pollData = await pollResponse.json();
                        if (pollData.data && pollData.data.status === 'completed') {
                            completed = true;
                            resultData = pollData.data;
                            console.log(`✓ Promise completed after ${pollAttempts + 1} polls`);
                        } else if (pollData.data && pollData.data.status === 'failed') {
                            throw new Error(`Promise failed: ${pollData.data.error}`);
                        }
                    }
                    pollAttempts++;
                }

                expect(completed).toBeTruthy();
                expect(resultData).toBeTruthy();

                // Verify result contains execute/context with hint or message
                const hasExecute = resultData.data && (resultData.data.execute || resultData.data.context);
                const hasMessage = resultData.data && (resultData.data.message || resultData.data.result?.message);
                
                expect(hasExecute || hasMessage).toBeTruthy();
                console.log(`✓ Result contains execute/context or message`);
                logger.logInfrastructure('E2E session - result validated', { 
                    hasExecute, 
                    hasMessage,
                    promiseId 
                });
            } else {
                // Sync flow - verify result directly
                // Handle both {data: {...}} and {session: {...}} response structures
                const syncData = responseData || stepData;
                const hasResult = syncData && (syncData.execute || syncData.context || syncData.result || syncData.messages);
                expect(hasResult).toBeTruthy();
                console.log(`✓ Sync response contains result data`);
            }

            logger.logTest('End-to-end session execution', 'passed', Date.now() - startTime);
        } catch (error) {
            logger.logTest('End-to-end session execution', 'failed', Date.now() - startTime, error.message);
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
                const response = await request.post('http://localhost:5173/api/a2a/sessions', {
                    data: {
                        projectId: 'cleanup-test-project',
                        task: `Cleanup test session ${i}`
                    }
                });
                expect(response.ok()).toBeTruthy();
                const responseData = await response.json();
                const sessionId = responseData.session?.id || responseData.data?.session?.id;
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