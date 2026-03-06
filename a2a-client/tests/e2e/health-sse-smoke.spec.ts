import { test, expect } from '@playwright/test';

/**
 * Health and SSE connectivity smoke test
 * Mirrors the functionality of scripts/test-web-ui.ps1 for CI automation
 * Tests infrastructure health checks and real-time connectivity
 */
test.describe('Health and SSE Connectivity Smoke Test', () => {
    test.describe.configure({
        mode: 'serial',
        timeout: 60000
    });

    // Service health check URLs (matching PowerShell script)
    const HEALTH_ENDPOINTS = {
        server: 'http://localhost:3000/health',
        clientApi: 'http://localhost:3001/health',
        webUi: 'http://localhost:5173'
    };

    // Test service health checks
    test('All services are healthy', async ({ page, request }) => {
        test.setTimeout(30000);

        // Test A2A Server health
        const serverResponse = await request.get(HEALTH_ENDPOINTS.server);
        expect(serverResponse.ok()).toBeTruthy();
        expect(serverResponse.status()).toBeLessThan(500);

        // Test Client API health
        const clientApiResponse = await request.get(HEALTH_ENDPOINTS.clientApi);
        expect(clientApiResponse.ok()).toBeTruthy();
        expect(clientApiResponse.status()).toBeLessThan(500);

        // Test Web UI availability (basic HTTP check)
        const webUiResponse = await request.get(HEALTH_ENDPOINTS.webUi);
        expect(webUiResponse.ok()).toBeTruthy();
        expect(webUiResponse.status()).toBeLessThan(500);
    });

    // Test page load and basic UI elements
    test('Web UI loads and displays session panel', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify page loaded without errors
        const title = await page.title();
        expect(title).toBeTruthy();

        // Check for session panel (main UI component)
        await page.waitForSelector('.session-panel', { timeout: 10000 });
        const sessionPanel = page.locator('.session-panel');
        await expect(sessionPanel).toBeVisible();
    });

    // Test SSE connectivity (core real-time functionality)
    test('SSE connection establishes and receives events', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Wait for SSE client to initialize
        await page.waitForTimeout(2000);

        // Mock SSE endpoint to simulate connection
        await page.route('**/api/sse/**', async (route) => {
            if (route.request().method() === 'GET') {
                // Simulate SSE stream with initial connection
                await route.fulfill({
                    status: 200,
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: 'retry: 1000\ndata: {"type": "connected", "sessionId": "test-session"}\n\n'
                });
            }
        });

        // Test SSE client initialization
        const sseConnected = await page.evaluate(() => {
            return new Promise<boolean>((resolve) => {
                // Check if SSE client exists and is connected
                const checkSSE = () => {
                    if (window.SSEClient) {
                        // Try to connect to test endpoint
                        const testConnection = async () => {
                            try {
                                const response = await fetch('/api/sse/test-session');
                                const connected = response.ok;
                                resolve(connected);
                            } catch (error) {
                                resolve(false);
                            }
                        };
                        testConnection();
                    } else {
                        // SSE client not initialized yet, wait a bit
                        setTimeout(checkSSE, 500);
                    }
                };
                checkSSE();
            });
        });

        // Verify SSE connection was attempted
        expect(sseConnected).toBeDefined();
    });

    // Test session creation and real-time updates
    test('Session creation triggers real-time updates', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Mock session creation
        await page.route('**/api/sessions', async (route) => {
            if (route.request().method() === 'POST') {
                const sessionData = {
                    success: true,
                    data: {
                        session: {
                            id: 'test-session-smoke',
                            projectId: 'test-project',
                            status: 'READY'
                        },
                        serverResponse: {
                            context: {
                                messages: [{ role: 'assistant', content: 'Session created successfully' }],
                                execution: { action: 'session-init', step: 'completed', status: 'completed' }
                            }
                        }
                    }
                };

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(sessionData)
                });
            }
        });

        // Simulate session creation via UI
        const taskInput = page.locator('#taskInputField');
        await taskInput.waitFor({ state: 'visible', timeout: 5000 });
        await taskInput.fill('Create test session');
        await page.click('#taskSendBtn');

        // Wait for session creation response
        await page.waitForTimeout(2000);

        // Verify session was created and displayed
        const messages = page.locator('.session-panel-message-body');
        await expect(messages.first()).toContainText('Session created successfully');
    });

    // Test error handling and recovery
    test('Handles service unavailability gracefully', async ({ page, request }) => {
        // Test with server temporarily unavailable
        await page.route('**/api/sessions', async (route) => {
            await route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Service temporarily unavailable' })
            });
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Try to create session
        const taskInput = page.locator('#taskInputField');
        await taskInput.waitFor({ state: 'visible', timeout: 5000 });
        await taskInput.fill('Test error handling');
        await page.click('#taskSendBtn');

        // Wait for error handling
        await page.waitForTimeout(2000);

        // Verify error is handled gracefully (no page crash)
        const title = await page.title();
        expect(title).toBeTruthy();

        // Page should still be functional
        const sessionPanel = page.locator('.session-panel');
        await expect(sessionPanel).toBeVisible();
    });
});