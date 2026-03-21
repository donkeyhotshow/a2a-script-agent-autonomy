/**
 * Mocks Client API paths used by web/ (vite-plugin-a2a), not /api/v1/sessions.
 */
import type {Page} from '@playwright/test';
import {fixtures} from './index.js';

export async function installMockA2aClientApi(page: Page): Promise<void> {
    await page.route('**/api/a2a/projects', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                projects: [{id: 'proj-mock', name: 'Mock project', path: '/'}]
            })
        });
    });

    await page.route('**/api/a2a/sessions**', async (route) => {
        const method = route.request().method();
        const pathname = new URL(route.request().url()).pathname;

        if (method === 'GET' && pathname === '/api/a2a/sessions') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({sessions: fixtures.sessions.data})
            });
        }

        if (method === 'POST' && pathname === '/api/a2a/sessions') {
            const newSession = {
                ...fixtures.createSession.data,
                id: `session_${Date.now()}`,
                title: 'New Session',
                createdAt: new Date().toISOString(),
                messages: []
            };
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({success: true, session: newSession})
            });
        }

        const one = pathname.match(/^\/api\/a2a\/sessions\/([^/]+)$/);
        if (method === 'GET' && one) {
            const id = one[1];
            const fromList = fixtures.sessions.data.find((s: {id: string}) => s.id === id);
            const data = fromList || {...fixtures.session.data, id};
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(data)
            });
        }

        return route.continue();
    });
}
