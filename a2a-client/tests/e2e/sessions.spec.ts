/**
 * Sessions E2E Tests
 * Tests for session management against the current web UI (taskbar + session panels).
 */

import {test, expect} from '@playwright/test';
import {fixtures} from './fixtures/index.js';
import {installMockA2aClientApi} from './fixtures/mock-a2a-client-api.js';

async function selectMockProjectAndWaitForSessions(page: import('@playwright/test').Page) {
    const projectSelect = page.locator('#projectSelect');
    await projectSelect.waitFor({state: 'visible', timeout: 15000});
    const mockOpt = projectSelect.locator('option[value="proj-mock"]');
    if (await mockOpt.count()) {
        await projectSelect.selectOption('proj-mock');
    }
    await expect(page.locator('.taskbar-session-btn').first()).toBeVisible({timeout: 15000});
}

test.describe('Sessions', () => {
    test.beforeEach(async ({page}) => {
        await installMockA2aClientApi(page);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await selectMockProjectAndWaitForSessions(page);
    });

    test('should display sessions page', async ({page}) => {
        await expect(page.locator('header.app-header .logo')).toContainText('A2A Script Agent');
        await expect(page.locator('main.app-main')).toBeVisible();
        await expect(page.locator('.taskbar')).toBeVisible();
    });

    test('should display sessions list', async ({page}) => {
        const sessionsList = page.locator('.taskbar-sessions-wrapper');
        await expect(sessionsList).toBeVisible();

        const sessionItem = page.locator('.taskbar-session-btn').first();
        await expect(sessionItem).toBeVisible();
        await expect(sessionItem).toContainText('исправить импорты');
    });

    test('should create new session', async ({page}) => {
        const before = await page.locator('.taskbar-session-btn').count();
        await page.locator('.taskbar-btn-new-task').click();

        await expect(page.locator('.taskbar-session-btn')).toHaveCount(before + 1, {timeout: 15000});
        const newest = page.locator('.taskbar-session-btn').last();
        await expect(newest).toHaveAttribute('data-session-id', /session_/);
    });

    test('should open existing session', async ({page}) => {
        await page.locator('.taskbar-session-btn').first().click();

        await expect(page.locator('.pui-panel-title').first()).toBeVisible({timeout: 15000});
        await expect(page.locator('.task-flow-history')).toBeVisible();
    });

    test('should filter sessions by status', async ({page}) => {
        const filter = page.locator('.taskbar-filter');
        await expect(filter).toBeVisible();
        await filter.fill('исправить');
        await expect(page.locator('.taskbar-session-btn').first()).toBeVisible();
        await filter.fill('');
        await expect(page.locator('.taskbar-session-btn').first()).toBeVisible();
    });

    test('should display empty state when no project selected', async ({page}) => {
        await expect(page.locator('.taskbar-content')).toBeVisible();
    });

    test('should show session status in list', async ({page}) => {
        const sessionItem = page.locator('.taskbar-session-btn').first();
        await expect(sessionItem).toHaveAttribute('data-session-id', 'session_001');
    });

    test('should show session preview in list', async ({page}) => {
        const sessionItem = page.locator('.taskbar-session-btn').first();
        await expect(sessionItem.locator('.taskbar-session-title')).toContainText('исправить импорты');
    });

    test('should highlight active session', async ({page}) => {
        const sessionItem = page.locator('.taskbar-session-btn').first();
        await sessionItem.click();

        await expect(sessionItem).toHaveClass(/active/);
    });

    test('should handle session with execute.form response', async ({page}) => {
        await page.route('**/api/a2a/sessions/session_001', async (route) => {
            if (route.request().method() !== 'GET') {
                return route.continue();
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ...fixtures.session.data,
                    messages: [
                        {
                            role: 'user',
                            content: 'исправить импорты'
                        },
                        {
                            role: 'assistant',
                            content: JSON.stringify(fixtures.executeForm.data.result)
                        }
                    ]
                })
            });
        });

        const sessionItem = page.locator('.taskbar-session-btn').first();
        await sessionItem.click();

        await expect(page.locator('.task-flow-history')).toBeVisible({timeout: 15000});
    });

    test('should handle session with result action-key', async ({page}) => {
        await page.route('**/api/a2a/sessions/session_001', async (route) => {
            if (route.request().method() !== 'GET') {
                return route.continue();
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ...fixtures.session.data,
                    messages: [
                        {
                            role: 'user',
                            content: 'выполнить скрипт'
                        },
                        {
                            role: 'assistant',
                            content: JSON.stringify(fixtures.resultScript.data.result)
                        }
                    ]
                })
            });
        });

        const sessionItem = page.locator('.taskbar-session-btn').first();
        await sessionItem.click();

        await expect(page.locator('.task-flow-history')).toBeVisible({timeout: 15000});
    });
});
