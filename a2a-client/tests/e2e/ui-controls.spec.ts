/**
 * UI Controls E2E Tests
 * Tests for point UI features: zoom, flow, filters
 */

import {test, expect} from '@playwright/test';
import {fixtures} from './fixtures/index.js';

test.describe('UI Controls', () => {

    test.beforeEach(async ({page}) => {
        await setupMockApi(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test.describe('Flow Controls', () => {

        test('should have flow container', async ({page}) => {
            const flowContainer = page.locator('#flow-container');
            await expect(flowContainer).toBeVisible();
        });

        test('should have flow header', async ({page}) => {
            const flowHeader = page.locator('.flow-header');
            await expect(flowHeader).toBeVisible();
            await expect(flowHeader).toContainText('Protocol Flow');
        });

        test('should have zoom in button', async ({page}) => {
            const zoomInBtn = page.locator('#flowZoomIn');
            await expect(zoomInBtn).toBeVisible();
        });

        test('should have zoom out button', async ({page}) => {
            const zoomOutBtn = page.locator('#flowZoomOut');
            await expect(zoomOutBtn).toBeVisible();
        });

        test('should have fit view button', async ({page}) => {
            const fitViewBtn = page.locator('#flowFitView');
            await expect(fitViewBtn).toBeVisible();
        });

        test('should have vueflow graph container', async ({page}) => {
            const vueflowGraph = page.locator('#vueflow-graph');
            await expect(vueflowGraph).toBeVisible();
        });
    });

    test.describe('Session Filter', () => {

        test('should have session filter dropdown', async ({page}) => {
            const filter = page.locator('#sessionFilter');
            await expect(filter).toBeVisible();
        });

        test('should have all filter option', async ({page}) => {
            const filter = page.locator('#sessionFilter');
            await filter.selectOption('all');
            await expect(filter).toHaveValue('all');
        });

        test('should have active filter option', async ({page}) => {
            const filter = page.locator('#sessionFilter');
            await filter.selectOption('active');
            await expect(filter).toHaveValue('active');
        });

        test('should have waiting filter option', async ({page}) => {
            const filter = page.locator('#sessionFilter');
            await filter.selectOption('waiting');
            await expect(filter).toHaveValue('waiting');
        });

        test('should have completed filter option', async ({page}) => {
            const filter = page.locator('#sessionFilter');
            await filter.selectOption('completed');
            await expect(filter).toHaveValue('completed');
        });
    });

    test.describe('Header', () => {

        test('should display logo', async ({page}) => {
            const logo = page.locator('.header .logo');
            await expect(logo).toHaveText('A2A');
        });

        test('should have sessions nav link', async ({page}) => {
            const navLink = page.locator('.nav-link[data-page="sessions"]');
            await expect(navLink).toBeVisible();
            await expect(navLink).toHaveClass(/active/);
        });

        test('should have status indicator', async ({page}) => {
            const statusDot = page.locator('#statusDot');
            await expect(statusDot).toBeVisible();
        });

        test('should have status text', async ({page}) => {
            const statusText = page.locator('#statusText');
            await expect(statusText).toBeVisible();
        });
    });

    test.describe('Footer', () => {

        test('should have footer', async ({page}) => {
            const footer = page.locator('.footer');
            await expect(footer).toBeVisible();
        });

        test('should show current project', async ({page}) => {
            const project = page.locator('#currentProject');
            await expect(project).toBeVisible();
            await expect(project).toHaveText('No project');
        });
    });

    test.describe('Buttons', () => {

        test('should have new session button', async ({page}) => {
            const newSessionBtn = page.locator('#newSession');
            await expect(newSessionBtn).toBeVisible();
            await expect(newSessionBtn).toHaveText('+ New');
        });

        test('should have primary style for send button', async ({page}) => {
            const sendBtn = page.locator('#sendMessage');
            await expect(sendBtn).toHaveClass(/btn-primary/);
        });

        test('should have secondary style for continue button', async ({page}) => {
            const continueBtn = page.locator('#btnContinue');
            await expect(continueBtn).toHaveClass(/btn-secondary/);
        });
    });

    test.describe('Graph Panel', () => {

        test('should have graph panel', async ({page}) => {
            const graphPanel = page.locator('#graphPanel');
            await expect(graphPanel).toBeVisible();
        });

        test('should show empty state initially', async ({page}) => {
            const graphPanel = page.locator('#graphPanel');
            await expect(graphPanel).toContainText('No entities in graph');
        });
    });

    test.describe('Responsive Layout', () => {

        test('should display three-column layout', async ({page}) => {
            const sessionsLayout = page.locator('.sessions-layout');
            await expect(sessionsLayout).toBeVisible();
        });

        test('should have sessions sidebar', async ({page}) => {
            const sidebar = page.locator('.sessions-sidebar');
            await expect(sidebar).toBeVisible();
        });

        test('should have session panel', async ({page}) => {
            const panel = page.locator('.session-panel');
            await expect(panel).toBeVisible();
        });

        test('should have flow container on right', async ({page}) => {
            const flowContainer = page.locator('.flow-container');
            await expect(flowContainer).toBeVisible();
        });
    });
});

/**
 * Set up mock API handlers
 */
async function setupMockApi(page) {
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

    await page.route(/\/api\/v1\/sessions\/[^/]+$/, async (route) => {
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(fixtures.session)
        });
    });
}
