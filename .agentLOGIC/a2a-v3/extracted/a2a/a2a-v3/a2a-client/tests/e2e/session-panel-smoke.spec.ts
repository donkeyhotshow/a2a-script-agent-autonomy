import { test, expect } from '@playwright/test';

test.describe('Session panel quick integration smoke test', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/api/a2a/projects', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projects: [{ id: 'proj-demo', name: 'Demo project' }]
                })
            });
        });

        await page.route('**/api/a2a/sessions?*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    sessions: [{ id: 'session-demo', projectId: 'proj-demo', status: 'READY' }]
                })
            });
        });

        await page.route('**/api/a2a/sessions', async (route) => {
            if (route.request().method() === 'POST') {
                const serverResponse = {
                    context: {
                        messages: [
                            { role: 'assistant', content: 'Initial assistant message' }
                        ],
                        execution: {
                            action: 'test-action',
                            step: 'initial',
                            status: 'in_progress',
                            progress: 10
                        },
                        version: '2.0'
                    },
                    execute: {
                        action: 'test-action',
                        message: { content: 'Server-side execute message' },
                        progress: 10
                    }
                };

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        data: {
                            session: {
                                id: 'session-demo',
                                projectId: 'proj-demo',
                                status: 'READY'
                            },
                            serverResponse
                        }
                    })
                });
                return;
            }

            await route.continue();
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('session panel reflects server execute', async ({ page }) => {
        await page.waitForSelector('.session-panel');

        await page.fill('#taskInputField', 'Check session panel sync');
        await page.click('#taskSendBtn');

        const assistantMessage = page.locator('.session-panel-message-body').first();
        await expect(assistantMessage).toContainText('Server-side execute message');
    });
});
