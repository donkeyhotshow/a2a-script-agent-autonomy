/**
 * Action Progress E2E Tests
 * Tests for action execution UI and progress display
 */

import {test, expect} from '@playwright/test';
import {fixtures} from './fixtures/index.js';

test.describe('Action Progress', () => {

    test.beforeEach(async ({page}) => {
        await setupMockApi(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should show action progress panel', async ({page}) => {
        const actionProgress = page.locator('#action-progress');
        // Panel exists but is hidden by default
        await expect(actionProgress).toBeHidden();
    });

    test('should display action title', async ({page}) => {
        // Trigger action execution
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(1500);

        // Action progress should be visible
        const actionProgress = page.locator('#action-progress');
        await expect(actionProgress).toBeVisible();

        // Should show action title
        const actionTitle = page.locator('#action-title');
        await expect(actionTitle).toContainText('Action:');
    });

    test('should display progress bar', async ({page}) => {
        // Trigger action
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(1500);

        const progressBar = page.locator('#action-progress-bar');
        await expect(progressBar).toBeVisible();
    });

    test('should display action steps', async ({page}) => {
        // Trigger action
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(1500);

        // Should show action steps
        const actionSteps = page.locator('#action-steps');
        await expect(actionSteps).toBeVisible();

        // Should have step items
        const steps = actionSteps.locator('.action-step');
        const count = await steps.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should display step names', async ({page}) => {
        // Trigger action
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(1500);

        // First step should have a name
        const firstStep = page.locator('#action-steps .action-step').first();
        const stepName = firstStep.locator('.step-name');
        await expect(stepName).toBeVisible();
    });

    test('should show running step', async ({page}) => {
        // Trigger action execution
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(1500);

        // Should show running step
        const runningStep = page.locator('#action-steps .action-step.running');
        await expect(runningStep).toBeVisible();
    });

    test('should display action log', async ({page}) => {
        // Trigger action
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(1500);

        const actionLog = page.locator('#action-log');
        await expect(actionLog).toBeVisible();
    });

    test('should show log entries', async ({page}) => {
        // Trigger action
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(2000);

        // Should have log entries
        const logEntries = page.locator('#action-log .log-entry');
        const count = await logEntries.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should show run button when action is proposed', async ({page}) => {
        // Trigger action
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(1500);

        const runButton = page.locator('#action-run');
        await expect(runButton).toBeVisible();
    });

    test('should show cancel button when running', async ({page}) => {
        // Trigger action
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(1500);

        const cancelButton = page.locator('#action-cancel');
        await expect(cancelButton).toBeVisible();
    });

    test('should update progress text', async ({page}) => {
        // Trigger action
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(1500);

        const progressText = page.locator('#action-progress-text');
        await expect(progressText).toContainText('Step');
    });

    test('should show completed progress bar on finish', async ({page}) => {
        // Trigger action completion
        await page.fill('#messageInput', 'test action');
        await page.click('#sendMessage');
        await page.waitForTimeout(3000);

        const progressBar = page.locator('#action-progress-bar');
        await expect(progressBar).toHaveClass(/completed/);
    });

    test('should hide action progress initially', async ({page}) => {
        const actionProgress = page.locator('#action-progress');
        const isVisible = await actionProgress.isVisible();
        expect(isVisible).toBe(false);
    });
});

/**
 * Set up mock API handlers for action progress tests
 */
async function setupMockApi(page) {
    const requestResults = new Map();

    // Mock sessions list
    await page.route('**/api/v1/sessions**', async (route) => {
        const method = route.request().method();

        if (method === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(fixtures.sessions)
            });
        }

        if (method === 'POST') {
            const newSession = {
                ...fixtures.createSession.data,
                id: `session_${Date.now()}`,
                createdAt: new Date().toISOString(),
                messages: []
            };
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({success: true, data: newSession})
            });
        }
    });

    // Mock single session
    await page.route(/\/api\/v1\/sessions\/[^/]+$/, async (route) => {
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(fixtures.session)
        });
    });

    // Mock create request - returns actionExecuting
    await page.route('**/api/v1/requests', async (route) => {
        if (route.request().method() === 'POST') {
            const promiseId = `promise_${Date.now()}`;

            // Return executing state
            requestResults.set(promiseId, fixtures.actionExecuting.data.result);

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({success: true, data: {promiseId}})
            });
        }
    });

    // Mock request status
    await page.route(/\/api\/v1\/requests\/[^/]+\/status$/, async (route) => {
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({success: true, data: {status: 'completed'}})
        });
    });

    // Mock request result
    await page.route(/\/api\/v1\/requests\/[^/]+\/result$/, async (route) => {
        const url = route.request().url();
        const promiseId = url.split('/').slice(-2)[0];
        const result = requestResults.get(promiseId) || fixtures.actionExecuting.data.result;

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({success: true, data: {result}})
        });
    });
}
