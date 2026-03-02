/**
 * Messaging E2E Tests
 * Tests for sending and receiving messages
 */

import {test, expect} from '@playwright/test';
import {fixtures} from './fixtures/index.js';

test.describe('Messaging', () => {

    test.beforeEach(async ({page}) => {
        await setupMockApi(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should have message input field', async ({page}) => {
        const messageInput = page.locator('#messageInput');
        await expect(messageInput).toBeVisible();
        await expect(messageInput).toHaveAttribute('placeholder', 'Enter task...');
    });

    test('should have send button', async ({page}) => {
        const sendButton = page.locator('#sendMessage');
        await expect(sendButton).toBeVisible();
        await expect(sendButton).toBeEnabled();
    });

    test('should have continue button (Делаем)', async ({page}) => {
        const continueButton = page.locator('#btnContinue');
        await expect(continueButton).toBeVisible();
        await expect(continueButton).toHaveText('Делаем');
    });

    test('should send message on button click', async ({page}) => {
        // Fill message
        await page.fill('#messageInput', 'Test task message');

        // Click send
        await page.click('#sendMessage');

        // Should add user message to session
        const userMessage = page.locator('#sessionMessages .msg.user').first();
        await expect(userMessage).toContainText('Test task message');
    });

    test('should send message on Enter key', async ({page}) => {
        // Fill message
        await page.fill('#messageInput', 'Test task on Enter');

        // Press Enter
        await page.press('#messageInput', 'Enter');

        // Should add user message
        const userMessage = page.locator('#sessionMessages .msg.user').first();
        await expect(userMessage).toContainText('Test task on Enter');
    });

    test('should clear input after sending', async ({page}) => {
        // Fill and send
        await page.fill('#messageInput', 'Test message');
        await page.click('#sendMessage');

        // Input should be cleared
        const messageInput = page.locator('#messageInput');
        await expect(messageInput).toHaveValue('');
    });

    test('should not send empty message', async ({page}) => {
        // Try to send empty message
        await page.click('#sendMessage');

        // Should not add any message
        const messages = page.locator('#sessionMessages .msg');
        await expect(messages).toHaveCount(0);
    });

    test('should show pending state while waiting', async ({page}) => {
        // Create session first
        await page.click('#newSession');
        await page.waitForTimeout(300);

        // Send message
        await page.fill('#messageInput', 'Test pending');
        await page.click('#sendMessage');

        // Should show pending message
        const pendingMessage = page.locator('#sessionMessages .msg.pending');
        await expect(pendingMessage).toBeVisible();

        // Should show spinner
        const spinner = pendingMessage.locator('.spinner');
        await expect(spinner).toBeVisible();
    });

    test('should disable input while pending', async ({page}) => {
        // Create session
        await page.click('#newSession');
        await page.waitForTimeout(300);

        // Send message
        await page.fill('#messageInput', 'Test disabled');
        await page.click('#sendMessage');

        // Input should be disabled
        const messageInput = page.locator('#messageInput');
        await expect(messageInput).toBeDisabled();

        // Send button should be disabled
        const sendButton = page.locator('#sendMessage');
        await expect(sendButton).toBeDisabled();
    });

    test('should display server response', async ({page}) => {
        // Send message
        await page.fill('#messageInput', 'Test response');
        await page.click('#sendMessage');

        // Wait for server response
        await page.waitForTimeout(1500);

        // Should show server message
        const serverMessage = page.locator('#sessionMessages .msg.server').first();
        await expect(serverMessage).toBeVisible();

        // Should show role as "Server"
        const role = serverMessage.locator('.msg-role');
        await expect(role).toContainText('Server');
    });

    test('should handle multi-line message', async ({page}) => {
        // Fill with multi-line text
        await page.fill('#messageInput', 'Line 1\nLine 2\nLine 3');

        // Send
        await page.click('#sendMessage');

        // Should preserve content
        const userMessage = page.locator('#sessionMessages .msg.user').first();
        await expect(userMessage).toContainText('Line 1');
    });

    test('should auto-scroll to latest message', async ({page}) => {
        // Send multiple messages
        for (let i = 1; i <= 3; i++) {
            await page.fill('#messageInput', `Message ${i}`);
            await page.click('#sendMessage');
            await page.waitForTimeout(200);
        }

        // Last message should be visible
        const lastMessage = page.locator('#sessionMessages .msg.user').last();
        await expect(lastMessage).toContainText('Message 3');
    });
});

/**
 * Set up mock API handlers for messaging tests
 */
async function setupMockApi(page) {
    let requestCounter = 0;
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

    // Mock create request
    await page.route('**/api/v1/requests', async (route) => {
        if (route.request().method() === 'POST') {
            requestCounter++;
            const promiseId = `promise_${Date.now()}`;

            // Return different results based on request count
            let result = fixtures.taskRequest.data.result;
            if (requestCounter >= 2) {
                result = fixtures.actionComplete.data.result;
            }

            requestResults.set(promiseId, result);

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
        const result = requestResults.get(promiseId) || fixtures.taskRequest.data.result;

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({success: true, data: {result}})
        });
    });
}
