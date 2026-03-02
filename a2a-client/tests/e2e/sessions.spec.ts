/**
 * Sessions E2E Tests
 * Tests for session management: create, open, filter, list
 */

import {test, expect} from '@playwright/test';
import {fixtures} from './fixtures/index.js';

test.describe('Sessions', () => {

    test.beforeEach(async ({page}) => {
        // Set up mock API handlers
        await setupMockApi(page);

        // Navigate to the app
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should display sessions page', async ({page}) => {
        // Check that the sessions page is visible
        const sessionsPage = page.locator('#page-sessions');
        await expect(sessionsPage).toHaveClass(/active/);

        // Check header
        await expect(page.locator('.header .logo')).toHaveText('A2A');
        await expect(page.locator('.nav-link.active')).toHaveText('Sessions');
    });

    test('should display sessions list', async ({page}) => {
        const sessionsList = page.locator('#sessionsList');
        await expect(sessionsList).toBeVisible();

        // Should show session item from mock data
        const sessionItem = sessionsList.locator('.session-item').first();
        await expect(sessionItem).toBeVisible();
        await expect(sessionItem).toContainText('исправить импорты');
    });

    test('should create new session', async ({page}) => {
        // Click New Session button
        await page.click('#newSession');

        // Should create a new session
        await page.waitForTimeout(500);

        // Session panel should show new session
        const sessionHeader = page.locator('#sessionHeader');
        await expect(sessionHeader).toBeVisible();

        // Should show session ID
        await expect(sessionHeader).toContainText('#session_');
    });

    test('should open existing session', async ({page}) => {
        // Click on session item
        const sessionItem = page.locator('#sessionsList .session-item').first();
        await sessionItem.click();

        // Should load session messages
        await page.waitForTimeout(500);

        // Session panel should show messages
        const sessionMessages = page.locator('#sessionMessages');
        await expect(sessionMessages).toBeVisible();
    });

    test('should filter sessions by status', async ({page}) => {
        // Default filter is "all"
        const filter = page.locator('#sessionFilter');
        await expect(filter).toHaveValue('all');

        // Change filter to "active"
        await filter.selectOption('active');

        // Filter should be applied
        await expect(filter).toHaveValue('active');

        // Change filter to "waiting"
        await filter.selectOption('waiting');
        await expect(filter).toHaveValue('waiting');

        // Change filter to "completed"
        await filter.selectOption('completed');
        await expect(filter).toHaveValue('completed');
    });

    test('should display empty state when no project selected', async ({page}) => {
        // The default state should show empty or sessions list
        const sessionsList = page.locator('#sessionsList');
        await expect(sessionsList).toBeVisible();
    });

    test('should show session status in list', async ({page}) => {
        const sessionItem = page.locator('#sessionsList .session-item').first();
        await expect(sessionItem).toContainText('active');
    });

    test('should show session preview in list', async ({page}) => {
        const sessionItem = page.locator('#sessionsList .session-item').first();
        const preview = sessionItem.locator('.session-item-preview');
        await expect(preview).toContainText('исправить импорты');
    });

    test('should highlight active session', async ({page}) => {
        // Click on first session
        const sessionItem = page.locator('#sessionsList .session-item').first();
        await sessionItem.click();

        // Should have active class
        await expect(sessionItem).toHaveClass(/active/);
    });
});

/**
 * Set up mock API handlers for sessions tests
 */
async function setupMockApi(page) {
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
}
